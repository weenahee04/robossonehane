import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-colors",
  {
    variants: {
      variant: {
        // Used in main dark app
        default:     "border-app-red/30 bg-app-red/10 text-app-red",
        secondary:   "border-white/10 bg-white/5 text-gray-300",
        success:     "border-green-500/30 bg-green-500/10 text-green-500",
        warning:     "border-amber-500/30 bg-amber-500/10 text-amber-400",
        destructive: "border-red-600/30 bg-red-600/10 text-red-600",
        outline:     "border-white/20 text-gray-400",
        gold:        "border-amber-500/50 bg-amber-500/20 text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
