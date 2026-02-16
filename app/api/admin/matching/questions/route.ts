import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { handleApiError } from '@/lib/errors'
import { PILLAR_CONFIGS } from '@/lib/pillarQuestions'
import { z } from 'zod'

export async function GET() {
  try {
    await requireAdmin()

    // Load any label overrides from SystemConfig
    const overrides = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'question_label_' } },
    })

    const overrideMap: Record<string, string> = {}
    overrides.forEach((o) => {
      overrideMap[o.key] = o.value
    })

    // Get answer counts per question
    const answerCounts = await prisma.pillarResponse.groupBy({
      by: ['questionId'],
      _count: { questionId: true },
    })

    const countMap: Record<string, number> = {}
    answerCounts.forEach((a) => {
      countMap[a.questionId] = a._count.questionId
    })

    // Flatten all questions from pillar configs with overrides and counts
    const questions = PILLAR_CONFIGS.flatMap((pillar) =>
      pillar.questions.map((q) => ({
        id: q.id,
        pillar: pillar.id,
        pillarName: pillar.name,
        label: overrideMap[`question_label_${q.id}`] || q.title,
        originalLabel: q.title,
        hasOverride: !!overrideMap[`question_label_${q.id}`],
        options: q.options,
        answerCount: countMap[q.id] || 0,
      }))
    )

    return NextResponse.json(questions)
  } catch (error) {
    return handleApiError(error)
  }
}

const updateSchema = z.object({
  questionId: z.string(),
  label: z.string().min(1),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await req.json()
    const { questionId, label } = updateSchema.parse(body)

    // Verify question exists
    const allQuestions = PILLAR_CONFIGS.flatMap((p) => p.questions)
    const originalQuestion = allQuestions.find((q) => q.id === questionId)
    if (!originalQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const key = `question_label_${questionId}`

    // If label matches original, remove override
    if (label === originalQuestion.title) {
      await prisma.systemConfig.deleteMany({ where: { key } })
    } else {
      await prisma.systemConfig.upsert({
        where: { key },
        create: { key, value: label, updatedBy: session.user.id },
        update: { value: label, updatedBy: session.user.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
