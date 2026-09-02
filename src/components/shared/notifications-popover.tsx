"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Bell, Inbox, FileText, Clock, IndianRupee, Check } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  category: string
}

export function NotificationsPopover() {
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])

  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.read).length
  }, [notifications])

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    toast.success("All notifications marked as read")
  }

  const handleNotificationClick = (id: string, title: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    toast(`Viewing notification: "${title}"`)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "enquiry":
        return <Inbox className="h-4 w-4 text-indigo-600" />
      case "quotation":
        return <FileText className="h-4 w-4 text-emerald-600" />
      case "followup":
        return <Clock className="h-4 w-4 text-amber-600" />
      case "payment":
        return <IndianRupee className="h-4 w-4 text-blue-600" />
      default:
        return <Bell className="h-4 w-4 text-slate-600" />
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:bg-slate-50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer">
            <Bell className="h-4 w-4 stroke-[1.8]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>
        }
      />
      
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden bg-white border border-border rounded-lg shadow-md mt-1">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50">
          <span className="font-semibold text-sm text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>
        
        <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-50">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-slate-600">No new notifications</p>
              <p className="text-[11px] text-slate-400">You are all caught up!</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif.id, notif.title)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/80 cursor-pointer",
                  !notif.read && "bg-indigo-50/15"
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  {getCategoryIcon(notif.category)}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-xs text-foreground", !notif.read ? "font-semibold" : "font-medium")}>
                      {notif.title}
                    </span>
                    {!notif.read && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    {notif.description}
                  </p>
                  <span className="text-[9px] text-slate-400 block pt-0.5">
                    {notif.time}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
        
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-center">
          <button 
            onClick={() => router.push("/communications")} 
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            View communication logs
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
