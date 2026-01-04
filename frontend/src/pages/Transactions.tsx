import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Link } from "react-router-dom"
import { financeApi } from "../lib/api"
import {
  formatCurrency,
  formatDate,
  formatCurrencyInput,
  parseCurrencyInput,
  getMaxAllowedDate,
  isDateWithinLimit,
  openNativePicker,
  getCategoryDotStyle,
} from "../lib/utils"
import type { Transaction } from "../types"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
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
  TrendingUp,
  TrendingDown,
  Filter,
  Receipt,
  Sparkles,
  Search,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react"

type TransactionPayload = {
  transaction_type: "INCOME" | "EXPENSE"
  amount: number | string
  date: string
  description: string
  category?: number | null
  account?: number | null
  tags?: string
  notes?: string
}

type TransactionFormState = {
  transaction_type: "INCOME" | "EXPENSE"
  amount: string
  date: string
  description: string
  category: string
  account: string
  tags: string
  notes: string
}

export function TransactionsPage() {
  const [monthFilter, setMonthFilter] = useState(format(new Date(), "yyyy-MM"))
  const queryClient = useQueryClient()
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])
  const maxDate = useMemo(() => getMaxAllowedDate(), [])
  const dateLimitLabel = useMemo(() => formatDate(maxDate), [maxDate])
  const [dateError, setDateError] = useState("")
  const [editDateError, setEditDateError] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const selectTriggerClasses =
    "h-11 w-full border-border/50 bg-background/50 focus:border-primary/50 focus:ring-primary/20"
  const [createForm, setCreateForm] = useState<TransactionFormState>({
    transaction_type: "EXPENSE",
    amount: "",
    date: today,
    description: "",
    category: "",
    account: "",
    tags: "",
    notes: "",
  })
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState<TransactionFormState>({
    transaction_type: "EXPENSE",
    amount: "",
    date: today,
    description: "",
    category: "",
    account: "",
    tags: "",
    notes: "",
  })
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", monthFilter],
    queryFn: () => financeApi.getTransactions({ month: monthFilter }),
  })

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => financeApi.getCategories(),
  })

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => financeApi.getAccounts(),
  })

  const categoryLookup = useMemo(() => {
    const entries = categories?.results ?? []
    return new Map(entries.map((category) => [category.id, category]))
  }, [categories])

  const createCategories = useMemo(() => {
    return (categories?.results ?? []).filter(
      (category) => category.category_type === createForm.transaction_type
    )
  }, [categories, createForm.transaction_type])

  const editCategories = useMemo(() => {
    return (categories?.results ?? []).filter(
      (category) => category.category_type === editForm.transaction_type
    )
  }, [categories, editForm.transaction_type])

  useEffect(() => {
    if (!editingTransaction) return
    const nextForm = {
      transaction_type: editingTransaction.transaction_type,
      amount: formatCurrencyInput(editingTransaction.amount),
      date: editingTransaction.date,
      description: editingTransaction.description,
      category: editingTransaction.category ? String(editingTransaction.category) : "",
      account: editingTransaction.account ? String(editingTransaction.account) : "",
      tags: editingTransaction.tags || "",
      notes: editingTransaction.notes || "",
    }
    setEditForm(nextForm)
    setEditDateError(
      isDateWithinLimit(nextForm.date) ? "" : `Data deve ser até ${dateLimitLabel}.`
    )
  }, [dateLimitLabel, editingTransaction])

  const resetCreateForm = () => {
    setCreateForm({
      transaction_type: "EXPENSE",
      amount: "",
      date: today,
      description: "",
      category: "",
      account: "",
      tags: "",
      notes: "",
    })
    setDateError("")
  }

  const handleCreateDialogChange = (open: boolean) => {
    setCreateOpen(open)
    resetCreateForm()
  }

  const createTransactionMutation = useMutation({
    mutationFn: financeApi.createTransaction,
    onSuccess: () => {
      handleCreateDialogChange(false)
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["monthlyReport"] })
      queryClient.invalidateQueries({ queryKey: ["budgetStatus"] })
    },
  })

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TransactionPayload> }) =>
      financeApi.updateTransaction(id, data),
    onSuccess: () => {
      setEditingTransaction(null)
      setEditDateError("")
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["monthlyReport"] })
      queryClient.invalidateQueries({ queryKey: ["budgetStatus"] })
    },
  })

  const deleteTransactionMutation = useMutation({
    mutationFn: financeApi.deleteTransaction,
    onSuccess: () => {
      setDeletingTransaction(null)
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["monthlyReport"] })
      queryClient.invalidateQueries({ queryKey: ["budgetStatus"] })
    },
  })

  // Calcular totais
  const totals = useMemo(() => {
    if (!transactions?.results) return { income: 0, expenses: 0, balance: 0 }

    const income = transactions.results
      .filter(t => t.transaction_type === "INCOME")
      .reduce((acc, t) => acc + parseFloat(t.amount), 0)

    const expenses = transactions.results
      .filter(t => t.transaction_type === "EXPENSE")
      .reduce((acc, t) => acc + parseFloat(t.amount), 0)

    return { income, expenses, balance: income - expenses }
  }, [transactions])

  const monthName = useMemo(() => {
    const [year, month] = monthFilter.split("-")
    return format(new Date(parseInt(year), parseInt(month) - 1), "MMMM 'de' yyyy", { locale: ptBR })
  }, [monthFilter])

  const handleCreateSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!createForm.description || !createForm.amount || !createForm.date) return
    if (!isDateWithinLimit(createForm.date)) {
      setDateError(`Data deve ser até ${dateLimitLabel}.`)
      return
    }

    const amountValue = parseCurrencyInput(createForm.amount)
    if (!amountValue || Number(amountValue) <= 0) return

    const payload: TransactionPayload = {
      transaction_type: createForm.transaction_type,
      amount: amountValue,
      date: createForm.date,
      description: createForm.description,
      category: createForm.category ? Number(createForm.category) : null,
      account: createForm.account ? Number(createForm.account) : null,
      tags: createForm.tags,
      notes: createForm.notes,
    }

    createTransactionMutation.mutate(payload)
  }

  const handleEditSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingTransaction) return
    if (!isDateWithinLimit(editForm.date)) {
      setEditDateError(`Data deve ser até ${dateLimitLabel}.`)
      return
    }

    const amountValue = parseCurrencyInput(editForm.amount)
    if (!amountValue || Number(amountValue) <= 0) return

    const payload: Partial<TransactionPayload> = {
      transaction_type: editForm.transaction_type,
      amount: amountValue,
      date: editForm.date,
      description: editForm.description,
      category: editForm.category ? Number(editForm.category) : null,
      account: editForm.account ? Number(editForm.account) : null,
      tags: editForm.tags,
      notes: editForm.notes,
    }

    updateTransactionMutation.mutate({ id: editingTransaction.id, data: payload })
  }

  const handleDelete = () => {
    if (!deletingTransaction) return
    deleteTransactionMutation.mutate(deletingTransaction.id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Movimentos
          </p>
          <h1 className="text-3xl font-semibold">Transações</h1>
          <p className="text-muted-foreground">
            Histórico de receitas e despesas confirmadas.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => handleCreateDialogChange(true)}
          className="gap-2 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          Nova transação
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card/50 to-card p-4 transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receitas</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {formatCurrency(totals.income)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-card/50 to-card p-4 transition-all hover:border-red-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Despesas</p>
              <p className="mt-1 text-2xl font-bold text-red-400">
                {formatCurrency(totals.expenses)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
              <ArrowDownRight className="h-5 w-5 text-red-400" />
            </div>
          </div>
        </div>

        <div className={`group relative overflow-hidden rounded-2xl border p-4 transition-all ${
          totals.balance >= 0
            ? "border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-card hover:border-primary/30"
            : "border-red-500/20 bg-gradient-to-br from-red-500/10 via-card/50 to-card hover:border-red-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className={`mt-1 text-2xl font-bold ${totals.balance >= 0 ? "text-primary" : "text-red-400"}`}>
                {formatCurrency(totals.balance)}
              </p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              totals.balance >= 0 ? "bg-primary/15" : "bg-red-500/15"
            }`}>
              <Wallet className={`h-5 w-5 ${totals.balance >= 0 ? "text-primary" : "text-red-400"}`} />
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={handleCreateDialogChange}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader className="border-b border-border/60 pb-4">
            <DialogTitle>Nova transação</DialogTitle>
            <DialogDescription>
              Registre manualmente uma movimentação.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 via-card/70 to-card/60 p-6 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.6)]">
            <form onSubmit={handleCreateSubmit} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Tipo <span className="text-emerald-300">*</span>
                </Label>
                <Select
                  value={createForm.transaction_type}
                  onValueChange={(value) => {
                    const nextType = value as TransactionFormState["transaction_type"]
                    setCreateForm((prev) => {
                      const nextCategories = (categories?.results ?? []).filter(
                        (category) => category.category_type === nextType
                      )
                      const validCategory = nextCategories.some(
                        (category) => String(category.id) === prev.category
                      )
                      return {
                        ...prev,
                        transaction_type: nextType,
                        category: validCategory ? prev.category : "",
                      }
                    })
                  }}
                >
                  <SelectTrigger className={selectTriggerClasses}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Despesa</SelectItem>
                    <SelectItem value="INCOME">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Valor <span className="text-emerald-300">*</span>
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={createForm.amount}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      amount: formatCurrencyInput(event.target.value),
                    }))
                  }
                  className="h-11 border-border/50 bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Data <span className="text-emerald-300">*</span>
                </Label>
                <Input
                  type="date"
                  value={createForm.date}
                  onClick={(event) => openNativePicker(event.currentTarget)}
                  onChange={(event) => {
                    const nextDate = event.target.value
                    setCreateForm((prev) => ({ ...prev, date: nextDate }))
                    setDateError(
                      isDateWithinLimit(nextDate)
                        ? ""
                        : `Data deve ser até ${dateLimitLabel}.`
                    )
                  }}
                  max={maxDate}
                  className="h-11 border-border/50 bg-background/50"
                />
                {dateError ? (
                  <p className="text-xs text-red-400">{dateError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Data máxima permitida: {dateLimitLabel}.
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-muted-foreground">
                  Descrição <span className="text-emerald-300">*</span>
                </Label>
                <Input
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="h-11 border-border/50 bg-background/50"
                  placeholder="Ex: Aluguel, Cachê do show, Compras"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Categoria</Label>
                <Select
                  value={createForm.category || "none"}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      category: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className={selectTriggerClasses}>
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {createCategories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label className="text-muted-foreground">Observações</Label>
                <textarea
                  value={createForm.notes}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  className="min-h-[88px] w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Detalhes adicionais"
                />
              </div>

              <DialogFooter className="md:col-span-2 lg:col-span-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCreateDialogChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={createTransactionMutation.isPending}
                  disabled={!createForm.description || !createForm.amount || !createForm.date}
                >
                  Salvar transação
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Filter className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Período:</span>
            <Input
              type="month"
              value={monthFilter}
              onClick={(event) => openNativePicker(event.currentTarget)}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-44 border-border/50 bg-background/50"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              {transactions?.count || 0} registros
            </Badge>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-border/40 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
              <Receipt className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold">Transações em {monthName}</h3>
              <p className="text-xs text-muted-foreground">
                {transactions?.count || 0} movimentações encontradas
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="border-primary/30 text-primary hover:bg-primary/10">
            <Link to="/ai">
              <Sparkles className="mr-1.5 h-4 w-4" />
              Nova via IA
            </Link>
          </Button>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : !transactions?.results?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/20">
                <Search className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">Nenhuma transação encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                Use o IA Copiloto para adicionar transações rapidamente
              </p>
              <Button asChild className="mt-4">
                <Link to="/ai">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Adicionar via IA
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions?.results?.map((transaction) => {
                const categoryInfo = transaction.category
                  ? categoryLookup.get(transaction.category)
                  : undefined
                const isIncome = transaction.transaction_type === "INCOME"

                return (
                  <div
                    key={transaction.id}
                    className={`group flex flex-col gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                      isIncome
                        ? "border-emerald-500/10 bg-emerald-500/5 hover:border-emerald-500/20 hover:bg-emerald-500/10"
                        : "border-red-500/10 bg-red-500/5 hover:border-red-500/20 hover:bg-red-500/10"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
                        isIncome ? "bg-emerald-500/15" : "bg-red-500/15"
                      }`}>
                        {isIncome ? (
                          <TrendingUp className="h-6 w-6 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-6 w-6 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{transaction.description}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(transaction.date)}
                          </span>
                          {categoryInfo && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={getCategoryDotStyle(categoryInfo.color)}
                                />
                                {transaction.category_name}
                              </span>
                              {categoryInfo.group && (
                                <Badge
                                  variant="outline"
                                  className="border-muted-foreground/20 bg-muted/20 text-xs"
                                >
                                  {categoryInfo.group}
                                </Badge>
                              )}
                            </>
                          )}
                          {transaction.account_name && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <span>{transaction.account_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`text-xl font-bold tabular-nums ${
                        isIncome ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {isIncome ? "+" : "-"}
                        {formatCurrency(parseFloat(transaction.amount))}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTransaction(transaction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingTransaction(transaction)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={!!editingTransaction}
        onOpenChange={(open) => {
          if (!open) setEditingTransaction(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar transação</DialogTitle>
            <DialogDescription>
              Ajuste os detalhes da movimentação selecionada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Tipo</Label>
              <Select
                value={editForm.transaction_type}
                onValueChange={(value) => {
                  const nextType = value as TransactionFormState["transaction_type"]
                  setEditForm((prev) => {
                    const nextCategories = (categories?.results ?? []).filter(
                      (category) => category.category_type === nextType
                    )
                    const validCategory = nextCategories.some(
                      (category) => String(category.id) === prev.category
                    )
                    return {
                      ...prev,
                      transaction_type: nextType,
                      category: validCategory ? prev.category : "",
                    }
                  })
                }}
              >
                <SelectTrigger className={selectTriggerClasses}>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                  <SelectItem value="INCOME">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Valor</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={editForm.amount}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    amount: formatCurrencyInput(event.target.value),
                  }))
                }
                className="h-11 border-border/50 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Data</Label>
              <Input
                type="date"
                value={editForm.date}
                onClick={(event) => openNativePicker(event.currentTarget)}
                onChange={(event) => {
                  const nextDate = event.target.value
                  setEditForm((prev) => ({ ...prev, date: nextDate }))
                  setEditDateError(
                    isDateWithinLimit(nextDate)
                      ? ""
                      : `Data deve ser até ${dateLimitLabel}.`
                  )
                }}
                max={maxDate}
                className="h-11 border-border/50 bg-background/50"
              />
              {editDateError ? (
                <p className="text-xs text-red-400">{editDateError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Data máxima permitida: {dateLimitLabel}.
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-muted-foreground">Descrição</Label>
              <Input
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="h-11 border-border/50 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Categoria</Label>
              <Select
                value={editForm.category || "none"}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    category: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className={selectTriggerClasses}>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {editCategories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Conta</Label>
              <Select
                value={editForm.account || "none"}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    account: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className={selectTriggerClasses}>
                  <SelectValue placeholder="Sem conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem conta</SelectItem>
                  {accounts?.results.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-muted-foreground">Tags</Label>
              <Input
                value={editForm.tags}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, tags: event.target.value }))
                }
                className="h-11 border-border/50 bg-background/50"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-muted-foreground">Observações</Label>
              <textarea
                value={editForm.notes}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                className="min-h-[90px] w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <DialogFooter className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTransaction(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={updateTransactionMutation.isPending}
                disabled={!editForm.description || !editForm.amount || !editForm.date}
              >
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingTransaction}
        onOpenChange={(open) => {
          if (!open) setDeletingTransaction(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir transação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold text-foreground">
                {deletingTransaction?.description}
              </span>
              ? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTransaction(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              isLoading={deleteTransactionMutation.isPending}
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
