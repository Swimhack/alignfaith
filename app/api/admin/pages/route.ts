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
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [pages, total] = await Promise.all([
      prisma.cmsPage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.cmsPage.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(pages, total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  content: z.string().min(1, 'Content is required'),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  showHeader: z.boolean().default(true),
  showFooter: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()
    const data = createSchema.parse(body)

    const page = await prisma.cmsPage.create({
      data: {
        ...data,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  content: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  showHeader: z.boolean().optional(),
  showFooter: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()
    const { id, ...data } = updateSchema.parse(body)

    const existing = await prisma.cmsPage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { updatedBy: session.user.id }
    if (data.title !== undefined) updateData.title = data.title
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.content !== undefined) updateData.content = data.content
    if (data.description !== undefined) updateData.description = data.description
    if (data.showHeader !== undefined) updateData.showHeader = data.showHeader
    if (data.showFooter !== undefined) updateData.showFooter = data.showFooter
    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
        updateData.publishedAt = new Date()
      }
    }

    const page = await prisma.cmsPage.update({ where: { id }, data: updateData })
    return NextResponse.json(page)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    await prisma.cmsPage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
