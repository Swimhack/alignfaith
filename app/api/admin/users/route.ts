import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getPaginationParams, paginatedResponse } from '@/lib/admin'
import { handleApiError } from '@/lib/errors'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)

    const q = searchParams.get('q') || ''
    const status = searchParams.get('status') || ''
    const tier = searchParams.get('tier') || ''
    const gender = searchParams.get('gender') || ''
    const profileComplete = searchParams.get('profileComplete') || ''
    const role = searchParams.get('role') || ''

    // Build where clause
    const where: Prisma.UserWhereInput = {}
    const andConditions: Prisma.UserWhereInput[] = []

    if (q) {
      andConditions.push({
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { profile: { firstName: { contains: q, mode: 'insensitive' } } },
          { profile: { lastName: { contains: q, mode: 'insensitive' } } },
          { profile: { displayName: { contains: q, mode: 'insensitive' } } },
        ],
      })
    }

    if (status) where.status = status as Prisma.EnumUserStatusFilter
    if (tier) where.tier = tier as Prisma.EnumMembershipTierFilter
    if (role) where.role = role as Prisma.EnumRoleFilter
    if (gender) andConditions.push({ profile: { gender: gender as Prisma.EnumGenderFilter } })
    if (profileComplete === 'true') andConditions.push({ profile: { isComplete: true } })
    if (profileComplete === 'false') {
      andConditions.push({
        OR: [
          { profile: { isComplete: false } },
          { profile: null },
        ],
      })
    }

    if (andConditions.length > 0) where.AND = andConditions

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          tier: true,
          createdAt: true,
          lastActiveAt: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              displayName: true,
              gender: true,
              isComplete: true,
              isVerified: true,
              isActive: true,
              photos: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true, isPrimary: true },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(users, total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}
