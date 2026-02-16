import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword, passwordSchema } from '@/lib/security'
import { handleApiError } from '@/lib/errors'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 })
    }

    const newHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
