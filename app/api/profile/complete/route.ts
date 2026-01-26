import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { handleApiError, AuthenticationError, ValidationError } from '@/lib/errors'
import { calculateAge, isValidAge } from '@/lib/security'

const profileCompleteSchema = z.object({
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime()) && isValidAge(date, 18)
  }, 'You must be 18 or older'),
  gender: z.enum(['MALE', 'FEMALE']),
  seekingGender: z.enum(['MALE', 'FEMALE']),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(50),
  bio: z.string().max(1000).optional(),
  relationshipGoal: z.enum(['MARRIAGE', 'SERIOUS_DATING', 'DISCERNING']),
  pillarScores: z.array(z.object({
    pillar: z.enum(['SPIRITUAL', 'MENTAL', 'PHYSICAL', 'FINANCIAL', 'APPEARANCE', 'INTIMACY']),
    selfScore: z.number().min(1).max(10),
  })).min(6, 'All 6 pillars must be scored'),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      throw new AuthenticationError()
    }

    const body = await req.json()
    const data = profileCompleteSchema.parse(body)

    // Find existing profile
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    })

    if (!existingProfile) {
      throw new ValidationError('Profile not found. Please register first.')
    }

    // Update profile and upsert pillar scores in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update basic profile info
      const profile = await tx.profile.update({
        where: { userId: session.user.id },
        data: {
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          seekingGender: data.seekingGender,
          city: data.city,
          state: data.state,
          bio: data.bio || null,
          relationshipGoal: data.relationshipGoal,
          isComplete: true,
          completedAt: new Date(),
        },
      })

      // Update or create pillar scores
      for (const score of data.pillarScores) {
        await tx.pillarScore.upsert({
          where: {
            profileId_pillar: {
              profileId: profile.id,
              pillar: score.pillar,
            },
          },
          update: {
            selfScore: score.selfScore,
          },
          create: {
            profileId: profile.id,
            pillar: score.pillar,
            selfScore: score.selfScore,
          },
        })
      }

      return profile
    })

    return NextResponse.json({
      success: true,
      message: 'Profile completed successfully',
      profile: {
        id: result.id,
        isComplete: result.isComplete,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
