import * as React from "react"
import { cn } from "../../lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label?: string
  }
  variant?: "default" | "success" | "warning" | "danger"
}

const variantStyles = {
  default: {
    icon: "bg-primary/15 text-primary",
    trend: "text-muted-foreground",
  },
  success: {
    icon: "bg-emerald-500/15 text-emerald-400",
    trend: "text-emerald-400",
  },
  warning: {
    icon: "bg-amber-500/15 text-amber-400",
    trend: "text-amber-400",
  },
  danger: {
    icon: "bg-red-500/15 text-red-400",
    trend: "text-red-400",
  },
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
  ...props
}: StatCardProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        "stat-tile flex items-start justify-between gap-4",
        className
      )}
      {...props}
    >
      <div className="flex-1 space-y-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 text-sm">
            {trend && (
              <span className={cn("flex items-center gap-1", styles.trend)}>
                {trend.value >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
            {subtitle && (
              <span className="text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </div>
      {Icon && (
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            styles.icon
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      )}
    </div>
  )
}
