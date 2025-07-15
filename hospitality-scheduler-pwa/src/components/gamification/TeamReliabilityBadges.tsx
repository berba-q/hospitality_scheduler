// hospitality-scheduler-pwa/src/components/gamification/TeamReliabilityBadges.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Shield, 
  Heart, 
  Clock, 
  Users, 
  Star, 
  Award,
  Zap,
  Target
  //TrendingUp,
  //CheckCircle2
} from 'lucide-react'

interface ReliabilityStats {
  acceptanceRate: number
  avgResponseTime: string
  helpfulnessScore: number
  currentStreak: number
  totalHelped: number
  teamRating: number
}

interface TeamReliabilityBadgesProps {
  stats: ReliabilityStats
  className?: string
}

const BADGES = [
  {
    id: 'reliable_responder',
    name: 'Reliable Responder',
    description: 'Responds to requests within 2 hours',
    icon: Clock,
    requirement: (stats: ReliabilityStats) => stats.avgResponseTime.includes('hour') && parseFloat(stats.avgResponseTime) <= 2,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'team_player',
    name: 'Team Player',
    description: 'Accepts 80%+ of swap requests',
    icon: Users,
    requirement: (stats: ReliabilityStats) => stats.acceptanceRate >= 80,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    id: 'helping_hand',
    name: 'Helping Hand',
    description: 'Helped colleagues 5+ times',
    icon: Heart,
    requirement: (stats: ReliabilityStats) => stats.totalHelped >= 5,
    color: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Current helping streak of 5+',
    icon: Zap,
    requirement: (stats: ReliabilityStats) => stats.currentStreak >= 5,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  {
    id: 'always_there',
    name: 'Always There',
    description: 'Accepts 100% of requests',
    icon: Shield,
    requirement: (stats: ReliabilityStats) => stats.acceptanceRate === 100 && stats.totalHelped >= 3,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'team_hero',
    name: 'Team Hero',
    description: 'Exceptional team support (90+ rating)',
    icon: Award,
    requirement: (stats: ReliabilityStats) => stats.teamRating >= 90,
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  }
]

export function TeamReliabilityBadges({ stats, className = '' }: TeamReliabilityBadgesProps) {
  const earnedBadges = BADGES.filter(badge => badge.requirement(stats))
  const availableBadges = BADGES.filter(badge => !badge.requirement(stats))

  if (earnedBadges.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-500" />
          <h3 className="font-medium text-sm">Team Reliability Recognition</h3>
        </div>
        
        <div className="space-y-3">
          {/* Earned Badges */}
          {earnedBadges.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-2">Your earned recognition:</p>
              <div className="flex flex-wrap gap-2">
                {earnedBadges.map((badge) => {
                  const Icon = badge.icon
                  return (
                    <Badge 
                      key={badge.id}
                      className={`${badge.color} flex items-center gap-1 px-2 py-1`}
                      variant="outline"
                    >
                      <Icon className="w-3 h-3" />
                      <span className="text-xs font-medium">{badge.name}</span>
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Next Badge to Earn */}
          {availableBadges.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-2">Next recognition to earn:</p>
              <div className="p-2 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                    <Target className="w-3 h-3 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{availableBadges[0].name}</p>
                    <p className="text-xs text-gray-500">{availableBadges[0].description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}