import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded border border-transparent px-2 py-0.5 font-ui text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-creative-spark-blue focus-visible:ring-2 focus-visible:ring-creative-spark-blue/25 aria-invalid:border-error [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-creative-spark-blue/50 bg-creative-spark-blue/10 text-on-surface [a&]:hover:bg-creative-spark-blue/20",
        secondary:
          "border-outline-variant bg-container-high text-on-surface [a&]:hover:bg-container-highest",
        destructive:
          "border-error/60 bg-error-container text-on-error-container focus-visible:ring-error/20 [a&]:hover:bg-error-container/80",
        outline:
          "border-outline-variant text-on-surface-variant [a&]:hover:bg-container [a&]:hover:text-on-surface",
        ghost: "text-on-surface-variant [a&]:hover:bg-container [a&]:hover:text-on-surface",
        link: "text-creative-spark-blue underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
