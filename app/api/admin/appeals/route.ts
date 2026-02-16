import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getPaginationParams, paginatedResponse } from '@/lib/admin'
import { handleApiError } from '@/lib/errors'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.appeal.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(appeals, total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

const reviewSchema = z.object({
  id: z.string(),
  status: z.enum(['APPROVED', 'DENIED']),
  response: z.string().min(1),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()
    const { id, status, response } = reviewSchema.parse(body)

    const appeal = await prisma.appeal.update({
      where: { id },
      data: {
        status,
        response,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    })

    // If approved, revert the original admin action
    if (status === 'APPROVED' && appeal.actionId) {
      const action = await prisma.adminAction.findUnique({ where: { id: appeal.actionId } })
      if (action) {
        await prisma.adminAction.update({
          where: { id: action.id },
          data: { isReverted: true, revertedAt: new Date(), revertedBy: session.user.id },
        })

        // Revert suspension/ban on the user
        if (action.action === 'USER_SUSPENDED' || action.action === 'USER_BANNED') {
          await prisma.user.update({
            where: { id: action.targetId },
            data: {
              status: 'ACTIVE',
              suspendedAt: null,
              suspendedUntil: null,
              banReason: null,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
