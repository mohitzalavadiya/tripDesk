import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  numericMode?: "integer" | "decimal"
}

function Input({
  className,
  type,
  numericMode,
  onKeyDown,
  onPaste,
  ...props
}: InputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (type === "number" || numericMode) {
      if (e.key === "e" || e.key === "E" || e.key === "+") {
        e.preventDefault();
      }
      if ((numericMode === "integer" || props.step === "1") && e.key === ".") {
        e.preventDefault();
      }
    }
    onKeyDown?.(e);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (type === "number" || numericMode) {
      const text = e.clipboardData?.getData("text")?.trim();
      if (text) {
        if (/[eE]/.test(text)) {
          e.preventDefault();
          return;
        }
        if ((numericMode === "integer" || props.step === "1") && text.includes(".")) {
          e.preventDefault();
          return;
        }
      }
    }
    onPaste?.(e);
  };

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-slate-800 transition-colors outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-100/70 disabled:opacity-50 aria-invalid:border-rose-500",
        className
      )}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      {...props}
    />
  )
}

export { Input }
