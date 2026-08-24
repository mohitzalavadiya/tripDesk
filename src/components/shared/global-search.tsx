"use client"

import * as React from "react"
import { Search, Compass, Users, Inbox, FileText, Hotel, ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface SearchResult {
  id: string
  title: string
  category: "customers" | "trips" | "enquiries" | "quotations" | "hotels"
  subtitle: string
  href: string
}

const mockSearchData: SearchResult[] = [
  { id: "1", title: "Rahul Patel", category: "customers", subtitle: "Customer • Kerala Enquiry Active", href: "/customers" },
  { id: "2", title: "Priya Shah", category: "customers", subtitle: "Customer • Goa Enquiry Active", href: "/customers" },
  { id: "3", title: "Kerala Holiday", category: "trips", subtitle: "Trip • Confirmed • 01 Sep", href: "/trips" },
  { id: "4", title: "Goa Beach Getaway", category: "trips", subtitle: "Trip • Confirmed • 12 Sep", href: "/trips" },
  { id: "5", title: "Dubai Luxury Experience", category: "trips", subtitle: "Trip • Pending • 20 Sep", href: "/trips" },
  { id: "6", title: "Enquiry from Amit Shah", category: "enquiries", subtitle: "Enquiry • New • Dubai", href: "/enquiries" },
  { id: "7", title: "Kerala Holiday Quote", category: "quotations", subtitle: "Quotation • Sent • ₹1,20,000", href: "/quotations" },
  { id: "8", title: "The Leela Kovalam", category: "hotels", subtitle: "Hotel • Partner • Kerala", href: "/hotels" },
]

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const filteredResults = React.useMemo(() => {
    if (!query) return mockSearchData.slice(0, 5)
    return mockSearchData.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(query.toLowerCase())
    )
  }, [query])

  const handleSelect = (item: SearchResult) => {
    toast.success(`Navigating to ${item.title} (${item.category})`)
    setOpen(false)
    setQuery("")
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "customers":
        return <Users className="h-4 w-4" />
      case "trips":
        return <Compass className="h-4 w-4" />
      case "enquiries":
        return <Inbox className="h-4 w-4" />
      case "quotations":
        return <FileText className="h-4 w-4" />
      case "hotels":
        return <Hotel className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center justify-between rounded-lg border border-border bg-slate-50 px-3 text-sm text-muted-foreground transition-all hover:bg-slate-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:w-64 lg:w-80"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4 stroke-[1.5]" />
          <span>Search anything...</span>
        </span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-white px-1.5 font-mono text-[10px] font-medium text-muted-foreground md:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden sm:max-w-md bg-white border border-border rounded-xl">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              Search TripDesk
            </DialogTitle>
          </DialogHeader>
          <div className="p-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers, trips, enquiries..."
              className="w-full bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-0 h-10 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2 border-t border-border">
            {filteredResults.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found for &quot;{query}&quot;
              </div>
            ) : (
              <div className="space-y-1">
                {filteredResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border bg-slate-50 px-4 py-2.5 text-[10px] text-muted-foreground font-medium">
            <div className="flex gap-2">
              <span>↑↓ Navigation</span>
              <span>↵ Enter to select</span>
            </div>
            <span>ESC to close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
