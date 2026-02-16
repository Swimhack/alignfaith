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
    const category = searchParams.get('category') || ''
    const severity = searchParams.get('severity')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (category) where.category = category
    if (severity !== null && severity !== '') where.severity = { gte: parseInt(severity) }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
        include: {
          reporter: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          reported: {
            select: {
              id: true,
              email: true,
              status: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.report.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(reports, total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

const updateSchema = z.object({
  reportId: z.string(),
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED', 'ESCALATED']).optional(),
  assignedTo: z.string().optional(),
  resolution: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()
    const { reportId, status, assignedTo, resolution } = updateSchema.parse(body)

    const data: Record<string, unknown> = {}
    if (status) {
      data.status = status
      if (status === 'RESOLVED' || status === 'DISMISSED') {
        data.isReviewed = true
        data.reviewedAt = new Date()
        data.reviewedBy = session.user.id
      }
    }
    if (assignedTo !== undefined) data.assignedTo = assignedTo
    if (resolution) data.resolution = resolution

    await prisma.report.update({ where: { id: reportId }, data })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
