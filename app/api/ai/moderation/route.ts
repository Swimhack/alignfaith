/**
 * API Route: Content Moderation
 * POST /api/ai/moderation
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { moderateContent, batchModerate } from '@/lib/gemini/services/moderation'
import { ModerationRequest, ContentType } from '@/lib/gemini/types'

const validContentTypes: ContentType[] = ['message', 'bio', 'reflection', 'comment']

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
    const { content, contentType, batch } = body

    // Handle batch moderation
    if (batch && Array.isArray(batch)) {
      const requests: ModerationRequest[] = batch.map((item: { content: string; contentType: ContentType }) => ({
        content: item.content,
        contentType: item.contentType || 'message',
        userId: session.user?.id,
      }))

      const results = await batchModerate(requests)
      return NextResponse.json({
        success: true,
        data: results,
      })
    }

    // Single content moderation
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      )
    }

    if (content.length < 1) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Content exceeds maximum length of 5000 characters' },
        { status: 400 }
      )
    }

    const type: ContentType = validContentTypes.includes(contentType)
      ? contentType
      : 'message'

    const request: ModerationRequest = {
      content,
      contentType: type,
      userId: session.user?.id,
    }

    const result = await moderateContent(request)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to moderate content' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Moderation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
