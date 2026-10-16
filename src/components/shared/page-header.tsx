import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import { BreadcrumbItem,Breadcrumbs } from "./breadcrumbs"

interface ActionConfig {
  label: string
  onClick?: () => void
  icon?: LucideIcon
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive"
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  primaryAction?: ActionConfig
  secondaryActions?: ActionConfig[]
  compact?: boolean
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  compact = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "bg-white border border-slate-200/80 rounded-2xl shadow-xs relative overflow-hidden",
        compact ? "p-2.5 sm:p-4" : "p-3.5 sm:p-6",
        className
      )}
    >
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

      <div className={cn("flex flex-col z-10 relative min-w-0", compact ? "gap-1.5 sm:gap-2.5" : "gap-2.5 sm:gap-3")}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-0.5 min-w-0">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}

        <div
          className={cn(
            "min-w-0",
            compact
              ? "flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap"
              : "flex flex-col gap-3 sm:gap-3.5 sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          <div className={cn("min-w-0", compact ? "space-y-0.5 flex-1" : "space-y-1")}>
            <h1
              className={cn(
                "font-black tracking-tight text-slate-900 break-words",
                compact
                  ? "text-base min-[360px]:text-lg sm:text-2xl"
                  : "text-lg min-[360px]:text-xl sm:text-3xl"
              )}
            >
              {title}
            </h1>
            {description && (
              <p
                className={cn(
                  "text-slate-500 max-w-2xl leading-normal",
                  compact
                    ? "text-[10px] sm:text-xs line-clamp-1 sm:line-clamp-none"
                    : "text-[11px] sm:text-sm"
                )}
              >
                {description}
              </p>
            )}
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 shrink-0",
              compact ? "w-auto" : "flex-wrap self-stretch sm:self-auto w-full sm:w-auto"
            )}
          >
            {secondaryActions?.map((action, index) => {
              const ActionIcon = action.icon
              return (
                <Button
                  key={index}
                  variant={action.variant || "outline"}
                  size="sm"
                  onClick={action.onClick}
                  className={cn(
                    "bg-white hover:bg-slate-50 border-slate-200 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer shrink-0",
                    compact ? "h-7 sm:h-8 px-2 sm:px-2.5" : "h-8 sm:h-9 px-2.5 sm:px-3"
                  )}
                >
                  {ActionIcon && <ActionIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 stroke-[1.8] shrink-0" />}
                  <span>{action.label}</span>
                </Button>
              )
            })}

            {primaryAction && (
              <Button
                variant={primaryAction.variant || "default"}
                size="sm"
                onClick={primaryAction.onClick}
                className={cn(
                  "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-all shrink-0 justify-center",
                  compact
                    ? "h-7 sm:h-8 px-2.5 sm:px-3 w-auto text-[11px] sm:text-xs"
                    : "h-8 sm:h-9 px-3 sm:px-4 w-full sm:w-auto"
                )}
              >
                {primaryAction.icon && (
                  <primaryAction.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 stroke-[1.8] shrink-0" />
                )}
                <span>{primaryAction.label}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
