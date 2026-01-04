import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition-all duration-200 hover:scale-105",
  {
    variants: {
      variant: {
        default:
          "bg-primary/90 text-primary-foreground border-primary/50 shadow-[0_2px_8px_-2px_rgba(14,116,144,0.3)]",
        secondary:
          "bg-secondary/80 text-secondary-foreground border-secondary/50 shadow-sm",
        success:
          "bg-success/15 text-success border-success/30 shadow-[0_2px_8px_-2px_rgba(34,197,94,0.2)]",
        warning:
          "bg-amber-400/20 text-amber-200 border-amber-400/30 shadow-[0_2px_8px_-2px_rgba(251,191,36,0.2)]",
        destructive:
          "bg-destructive/15 text-destructive border-destructive/30 shadow-[0_2px_8px_-2px_rgba(239,68,68,0.2)]",
        outline:
          "bg-card/60 text-foreground border-border/60 hover:bg-muted/50 hover:border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
