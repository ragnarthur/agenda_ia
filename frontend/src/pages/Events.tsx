import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { agendaApi } from "../lib/api"
import {
  formatCurrency,
  formatDate,
  formatCurrencyInput,
  parseCurrencyInput,
  getMaxAllowedDate,
  isDateWithinLimit,
  openNativePicker,
} from "../lib/utils"
import type { AgendaEvent } from "../types"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import { Skeleton } from "../components/ui/skeleton"
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Filter,
  Ticket,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react"

type EventFormState = {
  title: string
  event_type: "AULA" | "SHOW" | "FREELA" | "OUTRO"
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  location: string
  expected_amount: string
  actual_amount: string
  status: "PENDENTE" | "PAGO" | "CANCELADO"
  payment_date: string
  client_name: string
  auto_create_transaction: boolean
  notes: string
}

const splitDateTime = (value?: string | null): { date: string; time: string } => {
  if (!value) return { date: "", time: "" }
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  const iso = local.toISOString()
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) }
}

const buildDateTime = (date: string, time: string): string => {
  if (!date) return ""
  return `${date}T${time || "00:00"}`
}

const statusStyles: Record<string, string> = {
  PENDENTE: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  PAGO: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  CANCELADO: "border-red-500/30 bg-red-500/10 text-red-400",
}

const selectTriggerClasses =
  "h-11 border-border/70 bg-[hsl(var(--card))] text-foreground shadow-sm"
const selectContentClasses =
  "border-border/80 bg-[hsl(var(--popover))] shadow-2xl"

export function EventsPage() {
  const [monthFilter, setMonthFilter] = useState(format(new Date(), "yyyy-MM"))
  const queryClient = useQueryClient()
  const defaultStartDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])
  const defaultStartTime = useMemo(() => format(new Date(), "HH:mm"), [])
  const maxDate = useMemo(() => getMaxAllowedDate(), [])
  const dateLimitLabel = useMemo(() => formatDate(maxDate), [maxDate])
  const [dateError, setDateError] = useState("")
  const [editDateError, setEditDateError] = useState("")
  const [formData, setFormData] = useState<EventFormState>({
    title: "",
    event_type: "OUTRO",
    start_date: defaultStartDate,
    start_time: defaultStartTime,
    end_date: "",
    end_time: "",
    location: "",
    expected_amount: "",
    actual_amount: "",
    status: "PENDENTE",
    payment_date: "",
    client_name: "",
    auto_create_transaction: true,
    notes: "",
  })
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null)
  const [editForm, setEditForm] = useState<EventFormState>({
    title: "",
    event_type: "OUTRO",
    start_date: defaultStartDate,
    start_time: defaultStartTime,
    end_date: "",
    end_time: "",
    location: "",
    expected_amount: "",
    actual_amount: "",
    status: "PENDENTE",
    payment_date: "",
    client_name: "",
    auto_create_transaction: true,
    notes: "",
  })
  const [deletingEvent, setDeletingEvent] = useState<AgendaEvent | null>(null)

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", monthFilter],
    queryFn: () => agendaApi.getEvents({ month: monthFilter }),
  })

  useEffect(() => {
    if (!editingEvent) return
    const startParts = splitDateTime(editingEvent.start_datetime)
    const endParts = splitDateTime(editingEvent.end_datetime)
    const nextForm = {
      title: editingEvent.title,
      event_type: editingEvent.event_type,
      start_date: startParts.date,
      start_time: startParts.time,
      end_date: endParts.date,
      end_time: endParts.time,
      location: editingEvent.location || "",
      expected_amount: formatCurrencyInput(editingEvent.expected_amount || ""),
      actual_amount: formatCurrencyInput(editingEvent.actual_amount || ""),
      status: editingEvent.status,
      payment_date: editingEvent.payment_date || "",
      client_name: editingEvent.client_name || "",
      auto_create_transaction: editingEvent.auto_create_transaction,
      notes: editingEvent.notes || "",
    }
    setEditForm(nextForm)
    setEditDateError(getDateError(nextForm))
  }, [dateLimitLabel, editingEvent])

  const createEventMutation = useMutation({
    mutationFn: agendaApi.createEvent,
    onSuccess: () => {
      setFormData({
        title: "",
        event_type: "OUTRO",
        start_date: defaultStartDate,
        start_time: defaultStartTime,
        end_date: "",
        end_time: "",
        location: "",
        expected_amount: "",
        actual_amount: "",
        status: "PENDENTE",
        payment_date: "",
        client_name: "",
        auto_create_transaction: true,
        notes: "",
      })
      setDateError("")
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EventFormState> }) =>
      agendaApi.updateEvent(id, {
        title: data.title,
        event_type: data.event_type,
        start_datetime: buildDateTime(
          data.start_date || "",
          data.start_time || ""
        ),
        end_datetime: data.end_date
          ? buildDateTime(data.end_date, data.end_time || "")
          : null,
        location: data.location || undefined,
        expected_amount: data.expected_amount
          ? parseCurrencyInput(data.expected_amount)
          : null,
        actual_amount: data.actual_amount
          ? parseCurrencyInput(data.actual_amount)
          : null,
        status: data.status,
        payment_date: data.payment_date || null,
        client_name: data.client_name || undefined,
        auto_create_transaction: data.auto_create_transaction,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      setEditingEvent(null)
      setEditDateError("")
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: agendaApi.deleteEvent,
    onSuccess: () => {
      setDeletingEvent(null)
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  const handleCreateSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.title || !formData.start_date) return
    if (
      !isDateWithinLimit(formData.start_date) ||
      (formData.end_date && !isDateWithinLimit(formData.end_date)) ||
      (formData.payment_date && !isDateWithinLimit(formData.payment_date))
    ) {
      setDateError(`Datas devem ser até ${dateLimitLabel}.`)
      return
    }

    const expectedAmount = formData.expected_amount
      ? parseCurrencyInput(formData.expected_amount)
      : ""
    const actualAmount = formData.actual_amount
      ? parseCurrencyInput(formData.actual_amount)
      : ""

    createEventMutation.mutate({
      title: formData.title,
      event_type: formData.event_type,
      start_datetime: buildDateTime(formData.start_date, formData.start_time),
      end_datetime: formData.end_date
        ? buildDateTime(formData.end_date, formData.end_time)
        : null,
      location: formData.location || undefined,
      expected_amount: expectedAmount || null,
      actual_amount: actualAmount || null,
      status: formData.status,
      payment_date: formData.payment_date || null,
      client_name: formData.client_name || undefined,
      auto_create_transaction: formData.auto_create_transaction,
      notes: formData.notes || undefined,
    })
  }

  const handleEditSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingEvent) return
    if (
      !isDateWithinLimit(editForm.start_date) ||
      (editForm.end_date && !isDateWithinLimit(editForm.end_date)) ||
      (editForm.payment_date && !isDateWithinLimit(editForm.payment_date))
    ) {
      setEditDateError(`Datas devem ser até ${dateLimitLabel}.`)
      return
    }

    updateEventMutation.mutate({
      id: editingEvent.id,
      data: { ...editForm },
    })
  }

  const handleDelete = () => {
    if (!deletingEvent) return
    deleteEventMutation.mutate(deletingEvent.id)
  }

  const getDateError = (values: EventFormState) => {
    if (!isDateWithinLimit(values.start_date)) {
      return `Datas devem ser até ${dateLimitLabel}.`
    }
    if (values.end_date && !isDateWithinLimit(values.end_date)) {
      return `Datas devem ser até ${dateLimitLabel}.`
    }
    if (values.payment_date && !isDateWithinLimit(values.payment_date)) {
      return `Datas devem ser até ${dateLimitLabel}.`
    }
    return ""
  }

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

      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/80 to-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Novo evento</h3>
            <p className="text-xs text-muted-foreground">
              Registre aulas, shows e compromissos financeiros.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-muted-foreground">Título</Label>
            <Input
              value={formData.title}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, title: event.target.value }))
              }
              className="h-11 border-border/50 bg-background/50"
              placeholder="Ex: Aula de violão"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Tipo</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  event_type: value as EventFormState["event_type"],
                }))
              }
            >
              <SelectTrigger className={selectTriggerClasses}>
                <SelectValue className="text-foreground" placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className={selectContentClasses}>
                <SelectItem value="AULA">Aula</SelectItem>
                <SelectItem value="SHOW">Show</SelectItem>
                <SelectItem value="FREELA">Freela</SelectItem>
                <SelectItem value="OUTRO">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev) => {
                  const nextValues = {
                    ...prev,
                    status: value as EventFormState["status"],
                    actual_amount: value === "PAGO" ? prev.actual_amount : "",
                    payment_date: value === "PAGO" ? prev.payment_date : "",
                  }
                  setDateError(getDateError(nextValues))
                  return nextValues
                })
              }
            >
              <SelectTrigger className={selectTriggerClasses}>
                <SelectValue className="text-foreground" placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent className={selectContentClasses}>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="PAGO">Pago</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Data início</Label>
            <Input
              type="date"
              value={formData.start_date}
              onClick={(event) => openNativePicker(event.currentTarget)}
              onChange={(event) => {
                const nextValues = {
                  ...formData,
                  start_date: event.target.value,
                }
                setFormData(nextValues)
                setDateError(getDateError(nextValues))
              }}
              max={maxDate}
              className="h-11 border-border/50 bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Horário início</Label>
            <Input
              type="time"
              value={formData.start_time}
              onClick={(event) => openNativePicker(event.currentTarget)}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  start_time: event.target.value,
                }))
              }
              className="h-11 border-border/50 bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Data fim (opcional)</Label>
            <Input
              type="date"
              value={formData.end_date}
              onClick={(event) => openNativePicker(event.currentTarget)}
              onChange={(event) => {
                const nextValues = {
                  ...formData,
                  end_date: event.target.value,
                  end_time: event.target.value ? formData.end_time : "",
                }
                setFormData(nextValues)
                setDateError(getDateError(nextValues))
              }}
              max={maxDate}
              className="h-11 border-border/50 bg-background/50"
            />
          </div>

          {formData.end_date ? (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Horário fim</Label>
              <Input
                type="time"
                value={formData.end_time}
                onClick={(event) => openNativePicker(event.currentTarget)}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    end_time: event.target.value,
                  }))
                }
                className="h-11 border-border/50 bg-background/50"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-muted-foreground">Valor previsto</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={formData.expected_amount}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  expected_amount: formatCurrencyInput(event.target.value),
                }))
              }
              className="h-11 border-border/50 bg-background/50"
            />
          </div>

          {formData.status === "PAGO" ? (
            <>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Valor real</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={formData.actual_amount}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      actual_amount: formatCurrencyInput(event.target.value),
                    }))
                  }
                  className="h-11 border-border/50 bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Data de pagamento</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onClick={(event) => openNativePicker(event.currentTarget)}
                  onChange={(event) => {
                    const nextValues = {
                      ...formData,
                      payment_date: event.target.value,
                    }
                    setFormData(nextValues)
                    setDateError(getDateError(nextValues))
                  }}
                  max={maxDate}
                  className="h-11 border-border/50 bg-background/50"
                />
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label className="text-muted-foreground">Cliente</Label>
            <Input
              value={formData.client_name}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  client_name: event.target.value,
                }))
              }
              className="h-11 border-border/50 bg-background/50"
              placeholder="Nome do contratante"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-muted-foreground">Local</Label>
            <Input
              value={formData.location}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  location: event.target.value,
                }))
              }
              className="h-11 border-border/50 bg-background/50"
              placeholder="Endereço ou sala"
            />
          </div>

          <div className="space-y-2 md:col-span-2 lg:col-span-4">
            <Label className="text-muted-foreground">Observações</Label>
            <textarea
              value={formData.notes}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, notes: event.target.value }))
              }
              className="min-h-[88px] w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {dateError ? (
              <p className="text-xs text-red-400">{dateError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Datas máximas permitidas: {dateLimitLabel}.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <div className="flex items-center gap-3">
            <input
              id="auto-create-transaction"
              type="checkbox"
              checked={formData.auto_create_transaction}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  auto_create_transaction: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-border/60 bg-background text-primary focus:ring-2 focus:ring-primary/30"
            />
            <Label
              htmlFor="auto-create-transaction"
              className="text-sm text-foreground"
            >
              Criar transação automaticamente quando o evento for marcado como pago
            </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Gera uma receita no financeiro usando o valor previsto ou real.
            </p>
          </div>

          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <Button
              type="submit"
              isLoading={createEventMutation.isPending}
              disabled={!formData.title || !formData.start_date}
            >
              Salvar evento
            </Button>
          </div>
        </form>
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
              onClick={(event) => openNativePicker(event.currentTarget)}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-44 border-border/50 bg-background/50"
            />
          </div>
          <Badge
            variant="outline"
            className="ml-auto border-primary/30 bg-primary/10 text-primary"
          >
            {events?.count || 0} eventos
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
          ) : !events?.results?.length ? (
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
              {events?.results?.map((event) => (
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
                    <div className="flex items-center gap-3">
                      {(event.actual_amount || event.expected_amount) && (
                        <div className="flex items-center gap-1 text-lg font-bold text-emerald-400 tabular-nums">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(parseFloat(event.actual_amount || event.expected_amount || "0"))}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingEvent(event)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingEvent(event)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
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

      <Dialog
        open={!!editingEvent}
        onOpenChange={(open) => {
          if (!open) setEditingEvent(null)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar evento</DialogTitle>
            <DialogDescription>
              Atualize os detalhes do compromisso selecionado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-muted-foreground">Título</Label>
              <Input
                value={editForm.title}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="h-11 border-border/50 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Tipo</Label>
            <Select
              value={editForm.event_type}
              onValueChange={(value) =>
                setEditForm((prev) => ({
                  ...prev,
                  event_type: value as EventFormState["event_type"],
                }))
              }
            >
                <SelectTrigger className={selectTriggerClasses}>
                  <SelectValue className="text-foreground" placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className={selectContentClasses}>
                  <SelectItem value="AULA">Aula</SelectItem>
                  <SelectItem value="SHOW">Show</SelectItem>
                  <SelectItem value="FREELA">Freela</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) =>
                  setEditForm((prev) => {
                    const nextValues = {
                      ...prev,
                      status: value as EventFormState["status"],
                      actual_amount: value === "PAGO" ? prev.actual_amount : "",
                      payment_date: value === "PAGO" ? prev.payment_date : "",
                    }
                    setEditDateError(getDateError(nextValues))
                    return nextValues
                  })
                }
              >
                <SelectTrigger className={selectTriggerClasses}>
                  <SelectValue className="text-foreground" placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className={selectContentClasses}>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Data início</Label>
              <Input
                type="date"
                value={editForm.start_date}
                onClick={(event) => openNativePicker(event.currentTarget)}
                onChange={(event) => {
                  const nextValues = {
                    ...editForm,
                    start_date: event.target.value,
                  }
                  setEditForm(nextValues)
                  setEditDateError(getDateError(nextValues))
                }}
                max={maxDate}
                className="h-11 border-border/50 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Horário início</Label>
              <Input
                type="time"
                value={editForm.start_time}
                onClick={(event) => openNativePicker(event.currentTarget)}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    start_time: event.target.value,
                  }))
                }
                className="h-11 border-border/50 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Data fim (opcional)</Label>
              <Input
                type="date"
                value={editForm.end_date}
                onClick={(event) => openNativePicker(event.currentTarget)}
                onChange={(event) => {
                  const nextValues = {
                    ...editForm,
                    end_date: event.target.value,
                    end_time: event.target.value ? editForm.end_time : "",
                  }
                  setEditForm(nextValues)
                  setEditDateError(getDateError(nextValues))
                }}
                max={maxDate}
                className="h-11 border-border/50 bg-background/50"
              />
            </div>

            {editForm.end_date ? (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Horário fim</Label>
                <Input
                  type="time"
                  value={editForm.end_time}
                  onClick={(event) => openNativePicker(event.currentTarget)}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      end_time: event.target.value,
                    }))
                  }
                  className="h-11 border-border/50 bg-background/50"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-muted-foreground">Valor previsto</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={editForm.expected_amount}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    expected_amount: formatCurrencyInput(event.target.value),
                  }))
                }
                className="h-11 border-border/50 bg-background/50"
              />
            </div>

            {editForm.status === "PAGO" ? (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Valor real</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                    value={editForm.actual_amount}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        actual_amount: formatCurrencyInput(event.target.value),
                      }))
                    }
                    className="h-11 border-border/50 bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Data de pagamento</Label>
                  <Input
                    type="date"
                    value={editForm.payment_date}
                    onClick={(event) => openNativePicker(event.currentTarget)}
                    onChange={(event) => {
                      const nextValues = {
                        ...editForm,
                        payment_date: event.target.value,
                      }
                      setEditForm(nextValues)
                      setEditDateError(getDateError(nextValues))
                    }}
                    max={maxDate}
                    className="h-11 border-border/50 bg-background/50"
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label className="text-muted-foreground">Cliente</Label>
              <Input
                value={editForm.client_name}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    client_name: event.target.value,
                  }))
                }
                className="h-11 border-border/50 bg-background/50"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-muted-foreground">Local</Label>
              <Input
                value={editForm.location}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    location: event.target.value,
                  }))
                }
                className="h-11 border-border/50 bg-background/50"
              />
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-4">
              <Label className="text-muted-foreground">Observações</Label>
              <textarea
                value={editForm.notes}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                className="min-h-[88px] w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {editDateError ? (
                <p className="text-xs text-red-400">{editDateError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Datas máximas permitidas: {dateLimitLabel}.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <div className="flex items-center gap-3">
                <input
                  id="edit-auto-create-transaction"
                  type="checkbox"
                  checked={editForm.auto_create_transaction}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      auto_create_transaction: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-border/60 bg-background text-primary focus:ring-2 focus:ring-primary/30"
                />
                <Label
                  htmlFor="edit-auto-create-transaction"
                  className="text-sm text-foreground"
                >
                  Criar transação automaticamente quando o evento for marcado como pago
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Gera uma receita no financeiro usando o valor previsto ou real.
              </p>
            </div>

            <DialogFooter className="md:col-span-2 lg:col-span-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingEvent(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={updateEventMutation.isPending}
                disabled={!editForm.title || !editForm.start_date}
              >
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingEvent}
        onOpenChange={(open) => {
          if (!open) setDeletingEvent(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir evento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold text-foreground">
                {deletingEvent?.title}
              </span>
              ? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingEvent(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              isLoading={deleteEventMutation.isPending}
              onClick={handleDelete}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
