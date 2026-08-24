import * as React from "react"
import { AlertCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this information. Please check your connection and try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/50 p-6 text-center animate-in fade-in duration-200 dark:border-red-900/10 dark:bg-red-950/5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3 dark:bg-red-900/20 dark:text-red-400">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs mb-4">
        {description}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-1.5 h-8 text-xs bg-white hover:bg-slate-50 border-slate-200">
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  )
}
