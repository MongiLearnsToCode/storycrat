import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-outline-variant bg-container-lowest px-3 py-1 font-ui text-base text-on-surface transition-colors outline-none selection:bg-creative-spark-blue selection:text-on-primary placeholder:text-on-surface-variant/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-creative-spark-blue focus-visible:ring-2 focus-visible:ring-creative-spark-blue/25",
        "aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
