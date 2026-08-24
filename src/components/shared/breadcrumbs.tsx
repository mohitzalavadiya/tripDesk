import * as React from "react"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-[12px] font-medium text-muted-foreground">
      <ol className="flex items-center gap-1.5">
        <li className="flex items-center">
          <Link
            href="/dashboard"
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5 stroke-[1.8]" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          
          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 stroke-[2] text-slate-400" />
              {isLast || !item.href ? (
                <span className="text-slate-600 font-semibold truncate max-w-[120px] md:max-w-xs" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors truncate max-w-[120px] md:max-w-xs"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
