import * as React from "react"
import { LucideIcon, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center animate-in fade-in duration-200">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-4">
        <Icon className="h-6 w-6 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && (
        <Button onClick={onAction} variant="outline" size="sm" className="gap-1 bg-white hover:bg-slate-50 border-slate-200">
          <Plus className="h-4 w-4" />
          {actionText}
        </Button>
      )}
    </div>
  )
}
