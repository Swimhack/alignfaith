import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getPaginationParams, paginatedResponse } from '@/lib/admin'
import { handleApiError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)

    const search = searchParams.get('search') || ''
    const questionId = searchParams.get('questionId') || ''

    const where: Record<string, unknown> = {}
    if (search) {
      where.answer = { contains: search, mode: 'insensitive' }
    }
    if (questionId) {
      where.questionId = parseInt(questionId)
    }

    const [reflections, total] = await Promise.all([
      prisma.reflection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
              user: { select: { email: true } },
            },
          },
        },
      }),
      prisma.reflection.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(reflections, total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}
