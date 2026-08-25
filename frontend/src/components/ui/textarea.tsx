import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-outline-variant bg-container-low px-3 py-2 font-ui text-base text-on-surface transition-colors outline-none placeholder:text-on-surface-variant/50 focus-visible:border-creative-spark-blue focus-visible:ring-2 focus-visible:ring-creative-spark-blue/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
