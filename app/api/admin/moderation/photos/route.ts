import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getPaginationParams, paginatedResponse, performAdminAction } from '@/lib/admin'
import { handleApiError } from '@/lib/errors'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where: { isApproved: false, moderatedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // oldest first
        include: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
              userId: true,
            },
          },
        },
      }),
      prisma.photo.count({ where: { isApproved: false, moderatedAt: null } }),
    ])

    return NextResponse.json(paginatedResponse(photos, total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

const moderateSchema = z.object({
  photoIds: z.array(z.string()).min(1),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()
    const { photoIds, action, reason } = moderateSchema.parse(body)

    const adminId = session.user.id
    const now = new Date()

    if (action === 'approve') {
      await prisma.photo.updateMany({
        where: { id: { in: photoIds } },
        data: { isApproved: true, moderatedAt: now, moderatedBy: adminId },
      })

      // Create audit records for each photo
      const photos = await prisma.photo.findMany({
        where: { id: { in: photoIds } },
        include: { profile: { select: { userId: true } } },
      })
      for (const photo of photos) {
        await performAdminAction(adminId, photo.profile.userId, 'PHOTO_APPROVED', reason || 'Photo approved')
      }
    } else {
      await prisma.photo.updateMany({
        where: { id: { in: photoIds } },
        data: { isApproved: false, moderatedAt: now, moderatedBy: adminId },
      })

      const photos = await prisma.photo.findMany({
        where: { id: { in: photoIds } },
        include: { profile: { select: { userId: true } } },
      })
      for (const photo of photos) {
        await performAdminAction(adminId, photo.profile.userId, 'PHOTO_REJECTED', reason || 'Photo rejected')
      }
    }

    return NextResponse.json({ success: true, count: photoIds.length })
  } catch (error) {
    return handleApiError(error)
  }
}
