import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, performAdminAction } from '@/lib/admin'
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors'
import { z } from 'zod'

const actionSchema = z.object({
  action: z.enum([
    'USER_SUSPENDED', 'USER_BANNED', 'USER_WARNED', 'USER_UNSUSPENDED', 'USER_UNBANNED',
    'TIER_CHANGED', 'PROFILE_VERIFIED', 'PROFILE_FLAGGED', 'PROFILE_DEACTIVATED',
  ]),
  reason: z.string().min(1, 'Reason is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
  duration: z.number().optional(), // hours for suspensions
  newTier: z.enum(['FREE', 'TIER_1', 'TIER_2']).optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin()
    const { id: targetId } = await params
    const body = await req.json()
    const { action, reason, metadata, duration, newTier } = actionSchema.parse(body)

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      include: { profile: true },
    })
    if (!targetUser) throw new NotFoundError('User not found')

    const adminId = session.user.id
    let expiresAt: Date | undefined

    switch (action) {
      case 'USER_SUSPENDED': {
        expiresAt = duration
          ? new Date(Date.now() + duration * 60 * 60 * 1000)
          : undefined
        await prisma.user.update({
          where: { id: targetId },
          data: {
            status: 'SUSPENDED',
            suspendedAt: new Date(),
            suspendedUntil: expiresAt ?? null,
          },
        })
        break
      }

      case 'USER_BANNED': {
        await prisma.user.update({
          where: { id: targetId },
          data: {
            status: 'BANNED',
            banReason: reason,
          },
        })
        break
      }

      case 'USER_WARNED': {
        // No status change, just audit record
        break
      }

      case 'USER_UNSUSPENDED': {
        await prisma.user.update({
          where: { id: targetId },
          data: {
            status: 'ACTIVE',
            suspendedAt: null,
            suspendedUntil: null,
          },
        })
        break
      }

      case 'USER_UNBANNED': {
        await prisma.user.update({
          where: { id: targetId },
          data: {
            status: 'ACTIVE',
            banReason: null,
          },
        })
        break
      }

      case 'TIER_CHANGED': {
        if (!newTier) throw new ValidationError('newTier is required for TIER_CHANGED action')
        const oldTier = targetUser.tier
        await prisma.user.update({
          where: { id: targetId },
          data: { tier: newTier },
        })
        await performAdminAction(adminId, targetId, action, reason, { oldTier, newTier, ...metadata }, expiresAt)
        return NextResponse.json({ success: true })
      }

      case 'PROFILE_VERIFIED': {
        if (!targetUser.profile) throw new ValidationError('User has no profile')
        await prisma.profile.update({
          where: { userId: targetId },
          data: { isVerified: true },
        })
        break
      }

      case 'PROFILE_FLAGGED': {
        // Just audit record
        break
      }

      case 'PROFILE_DEACTIVATED': {
        if (!targetUser.profile) throw new ValidationError('User has no profile')
        await prisma.profile.update({
          where: { userId: targetId },
          data: { isActive: false },
        })
        await prisma.user.update({
          where: { id: targetId },
          data: { status: 'DEACTIVATED' },
        })
        break
      }
    }

    await performAdminAction(adminId, targetId, action, reason, metadata as Record<string, string | number | boolean | null> | undefined, expiresAt)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
