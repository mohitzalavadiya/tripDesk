import * as React from "react"
import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Breadcrumbs, BreadcrumbItem } from "./breadcrumbs"

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
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
}: PageHeaderProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

      <div className="flex flex-col gap-3 z-10 relative">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-0.5">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {title}
            </h1>
            {description && (
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-normal">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            {secondaryActions?.map((action, index) => {
              const ActionIcon = action.icon
              return (
                <Button
                  key={index}
                  variant={action.variant || "outline"}
                  size="sm"
                  onClick={action.onClick}
                  className="bg-white hover:bg-slate-50 border-slate-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer"
                >
                  {ActionIcon && <ActionIcon className="h-4 w-4 mr-1.5 stroke-[1.8]" />}
                  {action.label}
                </Button>
              )
            })}

            {primaryAction && (
              <Button
                variant={primaryAction.variant || "default"}
                size="sm"
                onClick={primaryAction.onClick}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs cursor-pointer transition-all"
              >
                {primaryAction.icon && (
                  <primaryAction.icon className="h-4 w-4 mr-1.5 stroke-[1.8]" />
                )}
                {primaryAction.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
