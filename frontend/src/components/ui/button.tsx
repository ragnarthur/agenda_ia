import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_14px_28px_-16px_rgba(15,23,42,0.35)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_10px_24px_-18px_rgba(239,68,68,0.4)] hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-[0_14px_28px_-16px_rgba(239,68,68,0.5)]",
        outline:
          "border border-input/80 bg-transparent text-foreground hover:bg-muted/50 hover:border-primary/50 hover:-translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_8px_20px_-18px_rgba(15,23,42,0.15)] hover:-translate-y-0.5 hover:bg-secondary/80 hover:shadow-[0_12px_24px_-16px_rgba(15,23,42,0.25)]",
        ghost: "text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:-translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        glow:
          "relative overflow-hidden bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground shadow-[0_18px_36px_-24px_rgba(14,116,144,0.4)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-20px_rgba(14,116,144,0.5)]",
        success:
          "bg-success text-success-foreground shadow-[0_10px_24px_-18px_rgba(34,197,94,0.35)] hover:-translate-y-0.5 hover:bg-success/90 hover:shadow-[0_14px_28px_-16px_rgba(34,197,94,0.45)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, isLoading, children, disabled, asChild, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || isLoading

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          aria-disabled={isDisabled || undefined}
          data-loading={isLoading ? "true" : undefined}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : null}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
