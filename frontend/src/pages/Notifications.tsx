import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react"
import { notificationsApi } from "../lib/api"
import { cn } from "../lib/utils"
import type { Notification } from "../types"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Skeleton } from "../components/ui/skeleton"

const typeMeta = {
  INFO: {
    icon: Info,
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-400",
  },
  WARNING: {
    icon: AlertTriangle,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
  },
  SUCCESS: {
    icon: CheckCircle,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
  },
  ERROR: {
    icon: XCircle,
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
  },
}

const priorityStyles = {
  LOW: "border-slate-500/30 bg-slate-500/10 text-slate-200",
  MEDIUM: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  HIGH: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  URGENT: "border-red-500/30 bg-red-500/10 text-red-200",
}

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getNotifications(),
  })

  const { data: unreadCount } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: () => notificationsApi.getUnreadCount(),
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] })
    },
  })

  const clearReadMutation = useMutation({
    mutationFn: () => notificationsApi.clearRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id)
    }
    if (notification.action_url) {
      navigate(notification.action_url)
    }
  }

  const unread = notifications?.results.filter((n) => !n.is_read) || []
  const read = notifications?.results.filter((n) => n.is_read) || []

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Central
        </p>
        <h1 className="text-3xl font-semibold">Notificações</h1>
        <p className="text-muted-foreground">
          Alertas, avisos e atualizações do sistema.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Não lidas</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {unreadCount?.unread_count || 0}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Bell className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Urgentes</p>
              <p className="mt-1 text-2xl font-bold text-red-400">
                {unreadCount?.by_priority?.URGENT || 0}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Alta prioridade</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                {unreadCount?.by_priority?.HIGH || 0}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-500/20 bg-gradient-to-br from-slate-500/10 via-card/50 to-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-200">
                {notifications?.count || 0}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/15">
              <BellOff className="h-5 w-5 text-slate-200" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Central de notificações</h3>
              <p className="text-xs text-muted-foreground">
                Tudo o que requer sua atenção
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unread.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Marcar todas como lidas
              </Button>
            )}
            {read.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-border/40 text-muted-foreground hover:bg-muted/20"
                onClick={() => clearReadMutation.mutate()}
                disabled={clearReadMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar lidas
              </Button>
            )}
          </div>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : notifications?.results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20">
                <Bell className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-muted-foreground">
                Nenhuma notificação
              </p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                Você está em dia com seus alertas
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {unread.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Não lidas ({unread.length})
                  </p>
                  <div className="space-y-3">
                    {unread.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onMarkAsRead={() =>
                          markAsReadMutation.mutate(notification.id)
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {read.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Lidas ({read.length})
                  </p>
                  <div className="space-y-3">
                    {read.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
}: {
  notification: Notification
  onClick: () => void
  onMarkAsRead?: () => void
}) {
  const meta = typeMeta[notification.notification_type]
  const Icon = meta?.icon || Info

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-all",
        notification.is_read
          ? "border-border/40 bg-muted/5 hover:border-border/70 hover:bg-muted/10"
          : "border-primary/30 bg-primary/10"
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            meta?.iconBg || "bg-muted/20"
          )}
        >
          <Icon className={cn("h-5 w-5", meta?.iconColor || "text-muted-foreground")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className={cn("font-semibold", notification.is_read && "text-muted-foreground")}>
                {notification.title}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {notification.message}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge
                variant="outline"
                className={priorityStyles[notification.priority]}
              >
                {notification.priority_display}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {notification.time_ago}
              </span>
            </div>
          </div>
        </div>
        {!notification.is_read && onMarkAsRead && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation()
              onMarkAsRead()
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </button>
  )
}
