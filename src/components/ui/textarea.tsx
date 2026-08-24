import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[70px] w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-800 transition-colors outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rose-500",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
