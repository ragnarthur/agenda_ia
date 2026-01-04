import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { aiApi } from "../lib/api"
import { cn } from "../lib/utils"
import type { ChatConversation } from "../types"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Skeleton } from "../components/ui/skeleton"
import { Markdown } from "../components/ui/markdown"
import {
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  TrendingUp,
  Target,
  Wallet,
  HelpCircle,
  Trash2,
} from "lucide-react"

const suggestedQuestions = [
  { icon: TrendingUp, text: "Como estão meus gastos este mês?", color: "text-emerald-400" },
  { icon: Target, text: "Qual o progresso das minhas metas?", color: "text-violet-400" },
  { icon: Wallet, text: "Onde posso economizar?", color: "text-amber-400" },
  { icon: HelpCircle, text: "Analise meu padrão de gastos", color: "text-sky-400" },
]

export function ChatPage() {
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [message, setMessage] = useState("")
  const [usage, setUsage] = useState({ tokens: 0, remaining: 0 })

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["chatConversations"],
    queryFn: () => aiApi.getChatConversations(),
  })

  // Calcula o ID efetivo: se está criando nova, usa null; senão usa selectedId ou primeira conversa
  const effectiveSelectedId = useMemo(() => {
    if (isCreatingNew) return null
    if (selectedId) return selectedId
    return conversations?.[0]?.id ?? null
  }, [isCreatingNew, selectedId, conversations])

  const { data: conversationDetail, isLoading: messagesLoading } = useQuery({
    queryKey: ["chatConversation", effectiveSelectedId],
    queryFn: () => aiApi.getChatConversation(effectiveSelectedId!),
    enabled: effectiveSelectedId !== null,
  })

  const chatMutation = useMutation({
    mutationFn: () =>
      aiApi.chat({
        message,
        conversation_id: effectiveSelectedId ?? undefined,
      }),
    onSuccess: (data) => {
      setSelectedId(data.conversation_id)
      setIsCreatingNew(false) // Nova conversa foi criada, desativa flag
      setMessage("")
      setUsage({
        tokens: data.usage.tokens_used,
        remaining: data.usage.requests_remaining,
      })
      queryClient.invalidateQueries({ queryKey: ["chatConversations"] })
      queryClient.invalidateQueries({
        queryKey: ["chatConversation", data.conversation_id],
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (conversationId: number) =>
      aiApi.deleteChatConversation(conversationId),
    onSuccess: () => {
      setSelectedId(null)
      queryClient.invalidateQueries({ queryKey: ["chatConversations"] })
    },
  })

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault()
    if (!message.trim()) return
    chatMutation.mutate()
  }

  const handleNewConversation = () => {
    setSelectedId(null)
    setIsCreatingNew(true)
    setMessage("")
  }

  const handleSelectConversation = (conversationId: number) => {
    setSelectedId(conversationId)
    setIsCreatingNew(false)
  }

  const handleDeleteConversation = (conversationId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Tem certeza que deseja excluir esta conversa?")) {
      deleteMutation.mutate(conversationId)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setMessage(question)
  }

  const activeConversation: ChatConversation | undefined = useMemo(
    () => effectiveSelectedId ? conversations?.find((item) => item.id === effectiveSelectedId) : undefined,
    [conversations, effectiveSelectedId]
  )

  // Scroll para o final quando novas mensagens chegam
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversationDetail?.messages])

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 overflow-hidden">
      {/* Header compacto */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
            <Bot className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Chat IA</h1>
            <p className="text-xs text-muted-foreground">
              Assistente financeiro inteligente
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {usage.tokens > 0 && (
            <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-400">
              <Zap className="mr-1.5 h-3 w-3" />
              {usage.tokens} tokens
            </Badge>
          )}
          {usage.remaining > 0 && (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              {usage.remaining} req
            </Badge>
          )}
        </div>
      </div>

      {/* Layout principal */}
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[280px,1fr]">
        {/* Sidebar de conversas */}
        <div className="hidden flex-col overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm lg:flex">
          <div className="flex shrink-0 items-center justify-between border-b border-border/40 p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Conversas</span>
              {conversations && conversations.length > 0 && (
                <Badge variant="outline" className="border-muted-foreground/30 text-xs">
                  {conversations.length}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-primary/30 px-2 text-primary hover:bg-primary/10"
              onClick={handleNewConversation}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nova
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {conversationsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : conversations && conversations.length > 0 ? (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group relative flex items-center gap-2 rounded-xl border px-2 py-2 transition-all cursor-pointer",
                      conversation.id === effectiveSelectedId
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent hover:border-border/40 hover:bg-muted/10"
                    )}
                    onClick={() => handleSelectConversation(conversation.id)}
                  >
                    <div className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      conversation.id === effectiveSelectedId
                        ? "bg-primary/20"
                        : "bg-muted/20 group-hover:bg-muted/30"
                    )}>
                      <MessageSquare className={cn(
                        "h-3.5 w-3.5",
                        conversation.id === effectiveSelectedId
                          ? "text-primary"
                          : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "truncate text-xs font-medium",
                        conversation.id === effectiveSelectedId
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {conversation.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      className="shrink-0 rounded-md p-1 text-muted-foreground/50 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                      title="Excluir conversa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/20">
                  <MessageSquare className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhuma conversa
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">
                  Inicie uma nova conversa
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Área principal do chat */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
          {/* Header do chat */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border/40 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold truncate">
                {activeConversation?.title || "Nova conversa"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {activeConversation ? "Conversa ativa" : "Comece uma nova conversa"}
              </p>
            </div>
            {activeConversation && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewConversation}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  title="Nova conversa"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  <span className="text-xs">Nova</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteConversation(activeConversation.id, e)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                  title="Excluir conversa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Área de mensagens */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {messagesLoading ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                  <Skeleton className="h-16 w-2/3 rounded-2xl" />
                </div>
                <div className="flex justify-end gap-3">
                  <Skeleton className="h-12 w-1/2 rounded-2xl" />
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                </div>
              </div>
            ) : conversationDetail?.messages?.length ? (
              <div className="space-y-4">
                {conversationDetail.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "flex-row-reverse" : ""
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      msg.role === "user"
                        ? "bg-primary/20"
                        : "bg-violet-500/20"
                    )}>
                      {msg.role === "user" ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <Bot className="h-4 w-4 text-violet-400" />
                      )}
                    </div>

                    {/* Mensagem */}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/40 bg-muted/10 text-foreground"
                      )}
                    >
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      ) : (
                        <Markdown content={msg.content} />
                      )}
                    </div>
                  </div>
                ))}

                {/* Indicador de digitando */}
                {chatMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
                      <Bot className="h-4 w-4 text-violet-400" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl border border-border/40 bg-muted/10 px-4 py-3">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                  <Bot className="h-8 w-8 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold">Olá! Como posso ajudar?</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Sou seu assistente financeiro. Pergunte sobre gastos, metas, orçamentos ou peça dicas personalizadas.
                </p>

                {/* Sugestões de perguntas */}
                <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                  {suggestedQuestions.map((suggestion, index) => {
                    const Icon = suggestion.icon
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestedQuestion(suggestion.text)}
                        className="group flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/5 px-3 py-2.5 text-left text-sm transition-all hover:border-primary/30 hover:bg-primary/5"
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", suggestion.color)} />
                        <span className="text-muted-foreground group-hover:text-foreground">
                          {suggestion.text}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Input de mensagem */}
          <div className="shrink-0 border-t border-border/40 p-3">
            <form onSubmit={handleSend} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={chatMutation.isPending}
                  className="h-10 border-border/50 bg-background/50 pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
              </div>
              <Button
                type="submit"
                disabled={!message.trim() || chatMutation.isPending}
                className="h-10 w-10 bg-gradient-to-r from-violet-500 to-fuchsia-500 p-0 hover:from-violet-600 hover:to-fuchsia-600"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
