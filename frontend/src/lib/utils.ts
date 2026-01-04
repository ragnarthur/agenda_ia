import type { CSSProperties } from "react"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: string | Date): string {
  const parsedDate =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? (() => {
          const [year, month, day] = date.split("-").map(Number)
          return new Date(year, month - 1, day)
        })()
      : new Date(date)

  return new Intl.DateTimeFormat("pt-BR").format(parsedDate)
}

const expenseGroupStyles: Record<string, string> = {
  alimentacao: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
  moradia: "border-indigo-400/40 bg-indigo-400/15 text-indigo-200",
  transporte: "border-sky-400/40 bg-sky-400/15 text-sky-200",
  saude: "border-rose-400/40 bg-rose-400/15 text-rose-200",
  educacao: "border-teal-400/40 bg-teal-400/15 text-teal-200",
  lazer: "border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-200",
  compras: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  "trabalho e musica": "border-violet-400/40 bg-violet-400/15 text-violet-200",
  financeiro: "border-slate-400/40 bg-slate-400/15 text-slate-200",
  familia: "border-pink-400/40 bg-pink-400/15 text-pink-200",
  outros: "border-gray-400/40 bg-gray-400/15 text-gray-200",
}

export function getExpenseGroupStyle(group?: string | null): string {
  if (!group) {
    return "border-border/70 bg-muted/30 text-muted-foreground"
  }
  const normalized = group
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  return (
    expenseGroupStyles[normalized] ??
    "border-border/70 bg-muted/30 text-muted-foreground"
  )
}

export function getCategoryDotStyle(color?: string | null): CSSProperties {
  if (!color) {
    return { backgroundColor: "hsl(var(--muted))" }
  }
  return { backgroundColor: color }
}
