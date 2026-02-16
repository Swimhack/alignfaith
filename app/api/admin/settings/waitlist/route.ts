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
    const status = searchParams.get('status') || 'pending'

    const where = status === 'pending' ? { isApproved: false } : status === 'approved' ? { isApproved: true } : {}

    const [entries, total] = await Promise.all([
      prisma.waitlistEntry.findMany({ where, skip, take: limit, orderBy: { createdAt: 'asc' } }),
      prisma.waitlistEntry.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(entries, total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

const actionSchema = z.object({
  entryIds: z.array(z.string()).min(1),
  action: z.enum(['approve', 'reject']),
})

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { entryIds, action } = actionSchema.parse(body)

    if (action === 'approve') {
      await prisma.waitlistEntry.updateMany({
        where: { id: { in: entryIds } },
        data: { isApproved: true, approvedAt: new Date() },
      })
    } else {
      await prisma.waitlistEntry.deleteMany({ where: { id: { in: entryIds } } })
    }

    return NextResponse.json({ success: true, count: entryIds.length })
  } catch (error) {
    return handleApiError(error)
  }
}
