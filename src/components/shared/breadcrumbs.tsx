import { ChevronRight,Home } from "lucide-react"
import Link from "next/link"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-[11px] sm:text-[12px] font-medium text-muted-foreground min-w-0">
      <ol className="flex items-center gap-1.5 flex-wrap min-w-0">
        <li className="flex items-center shrink-0">
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
            <li key={index} className="flex items-center gap-1.5 min-w-0">
              <ChevronRight className="h-3 w-3 stroke-[2] text-slate-400 shrink-0" />
              {isLast || !item.href ? (
                <span className="text-slate-600 font-semibold truncate max-w-[105px] min-[360px]:max-w-[140px] md:max-w-xs" aria-current="page" title={item.label}>
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors truncate max-w-[105px] min-[360px]:max-w-[140px] md:max-w-xs"
                  title={item.label}
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
