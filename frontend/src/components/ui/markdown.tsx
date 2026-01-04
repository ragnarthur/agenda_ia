import { cn } from "../../lib/utils"

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
  const renderMarkdown = (text: string) => {
    // Divide em linhas para processar listas e parágrafos
    const lines = text.split("\n")
    const elements: React.ReactNode[] = []
    let currentList: string[] = []
    let listType: "ul" | "ol" | null = null

    const flushList = () => {
      if (currentList.length > 0 && listType) {
        const ListTag = listType
        elements.push(
          <ListTag
            key={`list-${elements.length}`}
            className={cn(
              "my-2 space-y-1 pl-4",
              listType === "ol" ? "list-decimal" : "list-disc"
            )}
          >
            {currentList.map((item, i) => (
              <li key={i} className="text-sm">
                {parseInline(item)}
              </li>
            ))}
          </ListTag>
        )
        currentList = []
        listType = null
      }
    }

    lines.forEach((line, index) => {
      const trimmedLine = line.trim()

      // Lista não ordenada (- item ou * item)
      const ulMatch = trimmedLine.match(/^[-*]\s+(.+)$/)
      if (ulMatch) {
        if (listType !== "ul") {
          flushList()
          listType = "ul"
        }
        currentList.push(ulMatch[1])
        return
      }

      // Lista ordenada (1. item)
      const olMatch = trimmedLine.match(/^\d+\.\s+(.+)$/)
      if (olMatch) {
        if (listType !== "ol") {
          flushList()
          listType = "ol"
        }
        currentList.push(olMatch[1])
        return
      }

      // Se chegou aqui, não é lista - flush e processa linha
      flushList()

      // Linha vazia
      if (!trimmedLine) {
        if (index > 0 && index < lines.length - 1) {
          elements.push(<div key={`br-${index}`} className="h-2" />)
        }
        return
      }

      // Parágrafo normal
      elements.push(
        <p key={`p-${index}`} className="text-sm leading-relaxed">
          {parseInline(trimmedLine)}
        </p>
      )
    })

    // Flush lista final se houver
    flushList()

    return elements
  }

  const parseInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = []
    let remaining = text
    let keyIndex = 0

    while (remaining.length > 0) {
      // Bold com ** ou __
      const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/) ||
                        remaining.match(/^(.*?)__(.+?)__(.*)$/)
      if (boldMatch) {
        if (boldMatch[1]) {
          parts.push(<span key={keyIndex++}>{parseInlineSimple(boldMatch[1])}</span>)
        }
        parts.push(
          <strong key={keyIndex++} className="font-semibold text-foreground">
            {boldMatch[2]}
          </strong>
        )
        remaining = boldMatch[3]
        continue
      }

      // Italic com * ou _
      const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)$/) ||
                          remaining.match(/^(.*?)_(.+?)_(.*)$/)
      if (italicMatch) {
        if (italicMatch[1]) {
          parts.push(<span key={keyIndex++}>{parseInlineSimple(italicMatch[1])}</span>)
        }
        parts.push(
          <em key={keyIndex++} className="italic">
            {italicMatch[2]}
          </em>
        )
        remaining = italicMatch[3]
        continue
      }

      // Code inline com `
      const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)$/)
      if (codeMatch) {
        if (codeMatch[1]) {
          parts.push(<span key={keyIndex++}>{codeMatch[1]}</span>)
        }
        parts.push(
          <code
            key={keyIndex++}
            className="rounded bg-muted/30 px-1.5 py-0.5 font-mono text-xs"
          >
            {codeMatch[2]}
          </code>
        )
        remaining = codeMatch[3]
        continue
      }

      // Texto normal restante
      parts.push(<span key={keyIndex++}>{remaining}</span>)
      break
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>
  }

  const parseInlineSimple = (text: string): string => {
    return text
  }

  return (
    <div className={cn("space-y-1", className)}>
      {renderMarkdown(content)}
    </div>
  )
}
