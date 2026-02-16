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
    const status = searchParams.get('status') || 'all'

    const where = status === 'active' ? { isActive: true } : status === 'expired' ? { isActive: false } : {}

    const [promos, total] = await Promise.all([
      prisma.promoCode.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.promoCode.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(promos, total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

const createSchema = z.object({
  code: z.string().min(3).max(30).transform((v) => v.toUpperCase().replace(/\s/g, '')),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed', 'trial_extension']),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().optional(),
  validUntil: z.string().datetime().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()
    const data = createSchema.parse(body)

    const promo = await prisma.promoCode.create({
      data: {
        code: data.code,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json(promo, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

const patchSchema = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
  maxUses: z.number().int().positive().optional(),
  validUntil: z.string().datetime().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { id, ...updates } = patchSchema.parse(body)

    const data: Record<string, unknown> = {}
    if (updates.isActive !== undefined) data.isActive = updates.isActive
    if (updates.maxUses !== undefined) data.maxUses = updates.maxUses
    if (updates.validUntil !== undefined) data.validUntil = new Date(updates.validUntil)

    await prisma.promoCode.update({ where: { id }, data })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await prisma.promoCode.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
