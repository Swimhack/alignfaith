import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { handleApiError } from '@/lib/errors'

export async function GET() {
  try {
    await requireAdmin()

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      totalUsers,
      activeToday,
      pendingPhotos,
      openReports,
      pendingAppeals,
      activeMatches,
      waitlistSize,
      unreadFeedback,
      recentActions,
      alerts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: todayStart } } }),
      prisma.photo.count({ where: { isApproved: false, moderatedAt: null } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
      prisma.appeal.count({ where: { status: 'PENDING' } }),
      prisma.match.count({ where: { status: 'MATCHED' } }),
      prisma.waitlistEntry.count({ where: { isApproved: false } }),
      prisma.feedback.count({ where: { isRead: false } }),
      // Recent admin actions for activity feed
      prisma.adminAction.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          target: {
            select: {
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          admin: {
            select: {
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      // Alerts: photos pending > 24h, high-severity reports
      Promise.all([
        prisma.photo.count({
          where: {
            isApproved: false,
            moderatedAt: null,
            createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.report.count({ where: { status: 'OPEN', severity: { gte: 2 } } }),
      ]),
    ])

    return NextResponse.json({
      stats: {
        totalUsers,
        activeToday,
        pendingPhotos,
        openReports,
        pendingAppeals,
        activeMatches,
        waitlistSize,
        unreadFeedback,
      },
      recentActions,
      alerts: {
        stalePhotos: alerts[0],
        highSeverityReports: alerts[1],
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
