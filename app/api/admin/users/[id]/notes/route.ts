import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { handleApiError, NotFoundError } from '@/lib/errors'
import { z } from 'zod'

const notesSchema = z.object({
  notes: z.string(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const { notes } = notesSchema.parse(body)

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundError('User not found')

    await prisma.user.update({
      where: { id },
      data: { adminNotes: notes },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
