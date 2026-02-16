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

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.announcement.count(),
    ])

    return NextResponse.json(paginatedResponse(announcements, total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  target: z.enum(['ALL_USERS', 'FREE_TIER', 'TIER_1', 'TIER_2', 'MALE', 'FEMALE']).default('ALL_USERS'),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()
    const { title, content, target, startsAt, expiresAt } = createSchema.parse(body)

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        target,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

const updateSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  target: z.enum(['ALL_USERS', 'FREE_TIER', 'TIER_1', 'TIER_2', 'MALE', 'FEMALE']).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { id, ...data } = updateSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.content !== undefined) updateData.content = data.content
    if (data.target !== undefined) updateData.target = data.target
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null

    await prisma.announcement.update({ where: { id }, data: updateData })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
