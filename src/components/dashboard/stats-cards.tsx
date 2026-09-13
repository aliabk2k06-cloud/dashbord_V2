import { Card, CardContent } from '../ui/card'
import { Users, CheckCircle2, Clock } from 'lucide-react'

interface StatsCardsProps {
  total: number
  upToDate: number
  pending: number
  loading: boolean
}

export function StatsCards({ total, upToDate, pending, loading }: StatsCardsProps) {
  const cards = [
    {
      label: 'إجمالي التجار',
      value: total,
      icon: Users,
      color: 'text-foreground',
      dotColor: '',
    },
    {
      label: 'محدّثين',
      value: upToDate,
      icon: CheckCircle2,
      color: 'text-status-good',
      dotColor: 'bg-status-good',
    },
    {
      label: 'متأخرين',
      value: pending,
      icon: Clock,
      color: 'text-status-pending',
      dotColor: 'bg-status-pending',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="group relative overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <div className="flex items-center gap-2 mt-1">
                {card.dotColor && (
                  <span className={`inline-block h-2 w-2 rounded-full ${card.dotColor} animate-pulse`} />
                )}
                <p className={`text-2xl font-bold tabular-nums tracking-tight ${card.color}`}>
                  {loading ? '—' : card.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
