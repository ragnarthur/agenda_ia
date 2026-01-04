import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { api } from "../lib/api"
import { formatCurrency } from "../lib/utils"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Skeleton } from "../components/ui/skeleton"
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Filter,
  Ticket,
} from "lucide-react"

interface Event {
  id: number
  title: string
  event_type: string
  event_type_display: string
  start_datetime: string
  end_datetime: string | null
  location: string
  expected_amount: string | null
  status: string
  status_display: string
  notes: string
}

const statusStyles: Record<string, string> = {
  PENDENTE: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  PAGO: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  CANCELADO: "border-red-500/30 bg-red-500/10 text-red-400",
}

export function EventsPage() {
  const [monthFilter, setMonthFilter] = useState(format(new Date(), "yyyy-MM"))

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", monthFilter],
    queryFn: async () => {
      const response = await api.get<{ results: Event[] }>("/events/", {
        params: { month: monthFilter },
      })
      return response.data
    },
  })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Agenda
        </p>
        <h1 className="text-3xl font-semibold">Eventos</h1>
        <p className="text-muted-foreground">
          Aulas, shows e compromissos organizados.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Filter className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Mês:</span>
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-44 border-border/50 bg-background/50"
            />
          </div>
          <Badge
            variant="outline"
            className="ml-auto border-primary/30 bg-primary/10 text-primary"
          >
            {events?.results.length || 0} eventos
          </Badge>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
        <div className="flex items-center gap-3 border-b border-border/40 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <Ticket className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold">Eventos do mês</h3>
            <p className="text-xs text-muted-foreground">
              Agenda consolidada para o período selecionado
            </p>
          </div>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : events?.results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20">
                <Calendar className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-muted-foreground">
                Nenhum evento encontrado
              </p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                Escolha outro mês ou adicione novos eventos
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events?.results.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-border/40 bg-muted/5 p-4 transition-all hover:border-border/60 hover:bg-muted/10"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        <Badge
                          variant="outline"
                          className={statusStyles[event.status] || "border-border/40 bg-muted/10 text-muted-foreground"}
                        >
                          {event.status_display}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-muted-foreground/20 bg-muted/20 text-xs"
                        >
                          {event.event_type_display}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(event.start_datetime), "dd/MM/yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(event.start_datetime), "HH:mm")}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {event.expected_amount && (
                      <div className="flex items-center gap-1 text-lg font-bold text-emerald-400 tabular-nums">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(parseFloat(event.expected_amount))}
                      </div>
                    )}
                  </div>
                  {event.notes && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {event.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
