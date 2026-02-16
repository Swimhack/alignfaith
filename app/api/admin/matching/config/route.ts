import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { handleApiError } from '@/lib/errors'
import { loadMatchingConfig } from '@/lib/matching'
import { z } from 'zod'

export async function GET() {
  try {
    await requireAdmin()
    const config = await loadMatchingConfig()
    return NextResponse.json(config)
  } catch (error) {
    return handleApiError(error)
  }
}

const updateSchema = z.object({
  weights: z.record(z.string(), z.number()).optional(),
  hardStopQuestions: z.array(z.string()).optional(),
  thresholds: z.object({
    excellent: z.number(),
    strong: z.number(),
    moderate: z.number(),
    low: z.number(),
  }).optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()
    const { weights, hardStopQuestions, thresholds } = updateSchema.parse(body)
    const adminId = session.user.id

    const upserts: Promise<unknown>[] = []

    if (weights) {
      // Validate weights sum to 100
      const total = Object.values(weights).reduce((s: number, v: number) => s + v, 0)
      if (Math.abs(total - 100) > 0.01) {
        return NextResponse.json({ error: 'Weights must sum to 100' }, { status: 400 })
      }
      upserts.push(
        prisma.systemConfig.upsert({
          where: { key: 'matching_pillar_weights' },
          create: { key: 'matching_pillar_weights', value: JSON.stringify(weights), description: 'Pillar weights for matching algorithm', updatedBy: adminId },
          update: { value: JSON.stringify(weights), updatedBy: adminId },
        })
      )
    }

    if (hardStopQuestions) {
      upserts.push(
        prisma.systemConfig.upsert({
          where: { key: 'matching_hard_stops' },
          create: { key: 'matching_hard_stops', value: JSON.stringify(hardStopQuestions), description: 'Hard stop questions for matching', updatedBy: adminId },
          update: { value: JSON.stringify(hardStopQuestions), updatedBy: adminId },
        })
      )
    }

    if (thresholds) {
      upserts.push(
        prisma.systemConfig.upsert({
          where: { key: 'matching_thresholds' },
          create: { key: 'matching_thresholds', value: JSON.stringify(thresholds), description: 'Alignment tier thresholds', updatedBy: adminId },
          update: { value: JSON.stringify(thresholds), updatedBy: adminId },
        })
      )
    }

    await Promise.all(upserts)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
