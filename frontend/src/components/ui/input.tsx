import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-input/60 bg-background/80 px-4 py-2 text-sm",
            "shadow-sm ring-offset-background transition-all duration-200",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground/60",
            "hover:border-input hover:bg-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:border-primary/50 focus-visible:bg-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive/70 focus-visible:ring-destructive/50 focus-visible:border-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-destructive animate-slide-up">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
