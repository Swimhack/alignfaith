/**
 * API Route: Growth Recommendations
 * POST /api/ai/recommendations
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getGrowthRecommendations,
  getPillarRecommendation,
  identifyWeakestPillars,
  calculateGrowthScore,
} from '@/lib/gemini/services/recommendations'
import { RecommendationContext, Pillar, UserProfileData } from '@/lib/gemini/types'

const validPillars: Pillar[] = ['SPIRITUAL', 'MENTAL', 'PHYSICAL', 'FINANCIAL', 'APPEARANCE', 'INTIMACY']

export async function POST(req: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { userProfile, pillar, recentActivity, preferences } = body

    // Validate user profile
    if (!userProfile || !userProfile.pillars) {
      return NextResponse.json(
        { error: 'User profile with pillar scores is required' },
        { status: 400 }
      )
    }

    // Validate pillar scores are numbers
    for (const p of validPillars) {
      if (typeof userProfile.pillars[p] !== 'number') {
        return NextResponse.json(
          { error: `Invalid pillar score for ${p}` },
          { status: 400 }
        )
      }
    }

    // Single pillar recommendation
    if (pillar) {
      if (!validPillars.includes(pillar)) {
        return NextResponse.json(
          { error: `Invalid pillar. Must be one of: ${validPillars.join(', ')}` },
          { status: 400 }
        )
      }

      const result = await getPillarRecommendation(userProfile as UserProfileData, pillar)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to generate pillar recommendation' },
          { status: 500 }
        )
      }

      return NextResponse.json(result)
    }

    // Full growth recommendations
    const context: RecommendationContext = {
      userProfile: {
        ...userProfile,
        id: userProfile.id || session.user?.id || 'unknown',
        firstName: userProfile.firstName || 'User',
        reflections: userProfile.reflections || [],
      },
      recentActivity,
      preferences,
    }

    const result = await getGrowthRecommendations(context)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate recommendations' },
        { status: 500 }
      )
    }

    // Add supplementary data
    const weakestPillars = identifyWeakestPillars(context.userProfile as UserProfileData)
    const growthScore = calculateGrowthScore(context.userProfile as UserProfileData)

    return NextResponse.json({
      ...result,
      data: {
        recommendations: result.data,
        summary: {
          weakestPillars,
          growthScore,
          totalRecommendations: result.data?.length || 0,
        },
      },
    })
  } catch (error) {
    console.error('Recommendations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST with userProfile data.' },
    { status: 405 }
  )
}
