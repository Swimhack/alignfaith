import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { handleApiError } from '@/lib/errors'
import { z } from 'zod'

export async function GET() {
  try {
    await requireAdmin()
    const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } })
    return NextResponse.json(flags)
  } catch (error) {
    return handleApiError(error)
  }
}

const updateSchema = z.object({
  key: z.string(),
  value: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()
    const { key, value } = updateSchema.parse(body)

    await prisma.featureFlag.upsert({
      where: { key },
      create: { key, value, updatedBy: session.user.id },
      update: { value, updatedBy: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
