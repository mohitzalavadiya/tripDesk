import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-slate-800 transition-colors outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-100/70 disabled:opacity-50 aria-invalid:border-rose-500",
        className
      )}
      {...props}
    />
  )
}

export { Input }
