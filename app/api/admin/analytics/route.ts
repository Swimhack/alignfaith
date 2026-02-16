import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { handleApiError } from '@/lib/errors'

function getPeriodDate(period: string): Date {
  const now = new Date()
  switch (period) {
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    default: return new Date(0) // all time
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const tab = searchParams.get('tab') || 'engagement'
    const period = searchParams.get('period') || '30d'
    const since = getPeriodDate(period)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (tab === 'engagement') {
      const [dau, wau, mau, totalUsers, newSignups, profilesComplete, totalProfiles] = await Promise.all([
        prisma.user.count({ where: { lastActiveAt: { gte: todayStart } } }),
        prisma.user.count({ where: { lastActiveAt: { gte: weekAgo } } }),
        prisma.user.count({ where: { lastActiveAt: { gte: monthAgo } } }),
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: since } } }),
        prisma.profile.count({ where: { isComplete: true } }),
        prisma.profile.count(),
      ])

      return NextResponse.json({
        dau,
        wau,
        mau,
        dauMauRatio: mau > 0 ? Math.round((dau / mau) * 100) : 0,
        totalUsers,
        newSignups,
        profileCompletionRate: totalProfiles > 0 ? Math.round((profilesComplete / totalProfiles) * 100) : 0,
      })
    }

    if (tab === 'matching') {
      const [totalMatches, matchedCount, declinedCount, conversationCount, matchesPeriod] = await Promise.all([
        prisma.match.count(),
        prisma.match.count({ where: { status: 'MATCHED' } }),
        prisma.match.count({ where: { status: 'DECLINED' } }),
        prisma.conversation.count(),
        prisma.match.count({ where: { createdAt: { gte: since } } }),
      ])

      const matchRate = (matchedCount + declinedCount) > 0
        ? Math.round((matchedCount / (matchedCount + declinedCount)) * 100)
        : 0

      const matchToConvoRate = matchedCount > 0
        ? Math.round((conversationCount / matchedCount) * 100)
        : 0

      // Pillar score distribution
      const pillarScores = await prisma.pillarScore.groupBy({
        by: ['pillar'],
        _avg: { selfScore: true },
        _count: true,
      })

      return NextResponse.json({
        totalMatches,
        matchedCount,
        declinedCount,
        matchRate,
        conversationCount,
        matchToConvoRate,
        matchesPeriod,
        pillarScores: pillarScores.map((p) => ({
          pillar: p.pillar,
          avgScore: Math.round((p._avg.selfScore ?? 0) * 10) / 10,
          count: p._count,
        })),
      })
    }

    if (tab === 'safety') {
      const [totalReports, resolvedReports, openReports, banCount, suspensionCount, appealCount, approvedAppeals] = await Promise.all([
        prisma.report.count({ where: { createdAt: { gte: since } } }),
        prisma.report.count({ where: { status: 'RESOLVED', createdAt: { gte: since } } }),
        prisma.report.count({ where: { status: 'OPEN' } }),
        prisma.adminAction.count({ where: { action: 'USER_BANNED', createdAt: { gte: since } } }),
        prisma.user.count({ where: { status: 'SUSPENDED' } }),
        prisma.appeal.count({ where: { createdAt: { gte: since } } }),
        prisma.appeal.count({ where: { status: 'APPROVED', createdAt: { gte: since } } }),
      ])

      const resolutionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0
      const appealSuccessRate = appealCount > 0 ? Math.round((approvedAppeals / appealCount) * 100) : 0

      return NextResponse.json({
        totalReports,
        resolvedReports,
        openReports,
        resolutionRate,
        banCount,
        suspensionCount,
        appealCount,
        appealSuccessRate,
      })
    }

    if (tab === 'growth') {
      const [growthPostsCount, postsPerPillar, reflectionCount, totalProfilesWithReflections] = await Promise.all([
        prisma.growthPost.count({ where: { createdAt: { gte: since } } }),
        prisma.growthPost.groupBy({
          by: ['pillar'],
          _count: true,
          where: { createdAt: { gte: since } },
        }),
        prisma.reflection.count(),
        prisma.profile.count({ where: { reflections: { some: {} } } }),
      ])

      const totalProfiles = await prisma.profile.count()
      const reflectionCompletionRate = totalProfiles > 0 ? Math.round((totalProfilesWithReflections / totalProfiles) * 100) : 0

      return NextResponse.json({
        growthPostsCount,
        postsPerPillar: postsPerPillar.map((p) => ({ pillar: p.pillar, count: p._count })),
        reflectionCount,
        reflectionCompletionRate,
      })
    }

    return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
  } catch (error) {
    return handleApiError(error)
  }
}
