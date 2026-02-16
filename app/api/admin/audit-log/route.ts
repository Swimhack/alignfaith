import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getPaginationParams, paginatedResponse } from '@/lib/admin'
import { handleApiError } from '@/lib/errors'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)

    const action = searchParams.get('action') || ''
    const adminId = searchParams.get('adminId') || ''

    const where: Prisma.AdminActionWhereInput = {}
    if (action) where.action = action as Prisma.EnumAdminActionTypeFilter
    if (adminId) where.adminId = adminId

    const [actions, total] = await Promise.all([
      prisma.adminAction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          target: {
            select: {
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          admin: {
            select: {
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.adminAction.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(actions, total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}
