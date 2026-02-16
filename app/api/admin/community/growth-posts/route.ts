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

    const pillar = searchParams.get('pillar') || ''
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {}
    if (pillar) where.pillar = pillar
    if (search) {
      where.content = { contains: search, mode: 'insensitive' }
    }

    const [posts, total] = await Promise.all([
      prisma.growthPost.findMany({
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
      prisma.growthPost.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(posts, total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

const patchSchema = z.object({
  id: z.string(),
  action: z.enum(['remove']),
})

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { id } = patchSchema.parse(body)

    await prisma.growthPost.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
