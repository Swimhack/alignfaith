/**
 * API Route: Profile Compatibility Analysis
 * POST /api/ai/compatibility
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeCompatibility, quickCompatibilityCheck } from '@/lib/gemini/services/compatibility'
import { CompatibilityRequest } from '@/lib/gemini/types'

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
    const { userProfile, targetProfile, quick = false } = body

    // Validate required fields
    if (!userProfile || !targetProfile) {
      return NextResponse.json(
        { error: 'Both userProfile and targetProfile are required' },
        { status: 400 }
      )
    }

    // Validate pillar scores
    if (!userProfile.pillars || !targetProfile.pillars) {
      return NextResponse.json(
        { error: 'Pillar scores are required for both profiles' },
        { status: 400 }
      )
    }

    // Quick compatibility check (no AI)
    if (quick) {
      const score = await quickCompatibilityCheck(userProfile, targetProfile)
      return NextResponse.json({
        success: true,
        data: { score },
      })
    }

    // Full AI-powered analysis
    const request: CompatibilityRequest = {
      userProfile,
      targetProfile,
    }

    const result = await analyzeCompatibility(request)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to analyze compatibility' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Compatibility API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
