import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { aiApi, financeApi } from "../lib/api"
import { formatCurrency, formatDate, getCategoryDotStyle } from "../lib/utils"
import type { TransactionProposal } from "../types"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Badge } from "../components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../components/ui/alert"
import {
  Sparkles,
  Send,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Loader2,
  ClipboardList,
} from "lucide-react"

export function AITransactionsPage() {
  const [inputText, setInputText] = useState("")
  const [proposal, setProposal] = useState<TransactionProposal | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [tokensUsed, setTokensUsed] = useState(0)
  const [requestsRemaining, setRequestsRemaining] = useState(0)
  const queryClient = useQueryClient()

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => financeApi.getCategories(),
  })

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => financeApi.getAccounts(),
  })

  // Set initial category when proposal changes
  useEffect(() => {
    if (proposal?.category_suggestion && categories?.results) {
      const matched = categories.results.find(
        (c) => c.name.toLowerCase() === proposal.category_suggestion?.toLowerCase()
      )
      setSelectedCategoryId(matched ? String(matched.id) : null)
    } else {
      setSelectedCategoryId(null)
    }
  }, [proposal, categories])

  const parseMutation = useMutation({
    mutationFn: (text: string) => aiApi.parseTransaction(text),
    onSuccess: (data) => {
      setProposal(data.proposal)
      setTokensUsed(data.usage.tokens_used)
      setRequestsRemaining(data.usage.requests_remaining)
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: {
      transaction_type: "INCOME" | "EXPENSE"
      amount: number
      date: string
      description: string
      category?: number
      account?: number
    }) => financeApi.createTransaction(data),
    onSuccess: () => {
      setProposal(null)
      setInputText("")
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["monthlyReport"] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim()) {
      parseMutation.mutate(inputText.trim())
    }
  }

  const handleConfirm = () => {
    if (!proposal) return

    const account = accounts?.results.find(
      (a) =>
        a.name.toLowerCase() === proposal.account_suggestion?.toLowerCase() ||
        a.account_type === proposal.account_suggestion
    )

    saveMutation.mutate({
      transaction_type: proposal.type,
      amount: proposal.amount,
      date: proposal.date,
      description: proposal.description,
      category: selectedCategoryId ? Number(selectedCategoryId) : undefined,
      account: account?.id,
    })
  }

  const handleCancel = () => {
    setProposal(null)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Assistente
        </p>
        <h1 className="text-3xl font-semibold text-foreground">
          Assistente de <span className="text-primary">Lançamentos</span>
        </h1>
        <p className="text-muted-foreground">
          Transforme texto em transações prontas para confirmar.
        </p>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/90 to-card p-6 shadow-[0_8px_32px_-12px_rgba(45,212,191,0.15)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-emerald-500/20 shadow-lg shadow-primary/20">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Nova transação com IA</h3>
            <p className="text-sm text-muted-foreground">
              Descreva como você falaria no dia a dia
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">O que aconteceu?</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Ex: recebi 500 de cachê no show de sábado"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={parseMutation.isPending}
                className="h-12 flex-1 text-base"
              />
              <Button
                type="submit"
                disabled={!inputText.trim() || parseMutation.isPending}
                className="h-12 min-w-[52px] bg-gradient-to-r from-primary to-emerald-400 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                {parseMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {parseMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível analisar</AlertTitle>
              <AlertDescription>
                {(parseMutation.error as any)?.response?.data?.error ||
                  "Erro ao processar transação"}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </div>

      {proposal && (() => {
        const isIncome = proposal.type === "INCOME"
        const proposalTheme = isIncome
          ? {
              panel: "border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card/80 to-card",
              icon: "bg-emerald-500/15 text-emerald-400",
              badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
              text: "text-emerald-400",
            }
          : {
              panel: "border-red-500/20 bg-gradient-to-br from-red-500/5 via-card/80 to-card",
              icon: "bg-red-500/15 text-red-400",
              badge: "border-red-500/30 bg-red-500/10 text-red-400",
              text: "text-red-400",
            }

        return (
          <div className={`rounded-2xl border ${proposalTheme.panel} p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${proposalTheme.icon}`}>
                  {isIncome ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Proposta de transação</h3>
                  <p className="text-xs text-muted-foreground">
                    Revise os detalhes antes de confirmar
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={proposalTheme.badge}>
                Confiança {(proposal.confidence * 100).toFixed(0)}%
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Tipo
                </Label>
                <p className={`mt-2 text-lg font-semibold ${proposalTheme.text}`}>
                  {isIncome ? "Receita" : "Despesa"}
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Valor
                </Label>
                <p className="mt-2 text-xl font-semibold">
                  {formatCurrency(proposal.amount)}
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Data
                </Label>
                <p className="mt-2 font-medium">{formatDate(proposal.date)}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Descrição
                </Label>
                <p className="mt-2 font-medium">{proposal.description}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Categoria
                </Label>
                <div className="mt-2">
                  <Select
                    value={selectedCategoryId ?? ""}
                    onValueChange={setSelectedCategoryId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma categoria">
                        {selectedCategoryId && (() => {
                          const cat = categories?.results.find(c => String(c.id) === selectedCategoryId)
                          return cat ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={getCategoryDotStyle(cat.color)}
                              />
                              <span>{cat.name}</span>
                            </div>
                          ) : null
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.results.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={getCategoryDotStyle(cat.color)}
                            />
                            <span>{cat.name}</span>
                            {cat.group && (
                              <span className="text-xs text-muted-foreground">
                                ({cat.group})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {proposal.category_suggestion && !selectedCategoryId && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Sugestão da IA: <span className="text-foreground">{proposal.category_suggestion}</span>
                    </p>
                  )}
                  {proposal.category_suggestion && selectedCategoryId && (() => {
                    const selectedCat = categories?.results.find(c => String(c.id) === selectedCategoryId)
                    const isAiSuggestion = selectedCat?.name.toLowerCase() === proposal.category_suggestion?.toLowerCase()
                    return !isAiSuggestion ? (
                      <p className="mt-2 text-xs text-amber-400">
                        Categoria alterada (sugestão IA: {proposal.category_suggestion})
                      </p>
                    ) : null
                  })()}
                </div>
              </div>
              {proposal.account_suggestion && (
                <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
                  <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Conta sugerida
                  </Label>
                  <p className="mt-2 font-medium">{proposal.account_suggestion}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleConfirm}
                disabled={saveMutation.isPending}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-primary-foreground"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Confirmar e salvar
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={saveMutation.isPending}
                className="border-border/50"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </div>

            {saveMutation.isError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Falha ao salvar</AlertTitle>
                <AlertDescription>
                  {(saveMutation.error as any)?.response?.data?.error ||
                    "Erro ao salvar transação"}
                </AlertDescription>
              </Alert>
            )}

            {saveMutation.isSuccess && (
              <Alert variant="success" className="mt-4">
                <AlertTitle>Transação salva</AlertTitle>
                <AlertDescription>
                  Transação salva com sucesso!
                </AlertDescription>
              </Alert>
            )}
          </div>
        )
      })()}

      {tokensUsed > 0 && (
        <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>
              Última requisição: {tokensUsed} tokens | Requisições restantes: {" "}
              {requestsRemaining}
            </span>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
        <div className="flex items-center gap-3 border-b border-border/40 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <ClipboardList className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold">Exemplos de comandos</h3>
            <p className="text-xs text-muted-foreground">
              Clique para usar como exemplo
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-5 text-sm sm:grid-cols-2">
          {[
            "paguei 38,90 em cordas hoje no pix",
            "recebi 500 de cachê do show de sábado",
            "gastei 150 no mercado ontem",
            "salário de 2500 caiu hoje",
          ].map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setInputText(example)}
              className="group rounded-xl border border-border/40 bg-muted/5 px-4 py-3 text-left text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground hover:shadow-[0_4px_12px_-4px_rgba(45,212,191,0.3)]"
            >
              <span className="opacity-50 group-hover:opacity-70">"</span>
              {example}
              <span className="opacity-50 group-hover:opacity-70">"</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
