import { UIMessage } from "ai"
import showdown from 'showdown'

const converter = new showdown.Converter({ tables: true })

export type ReasoningType = {
    title: string | undefined,
    content: string | undefined
}

export const reasoning = (m: UIMessage): ReasoningType | undefined => {
    const part = m?.parts?.find((part) => part.type === 'reasoning')
    if (!part || part.state === 'done') return undefined
    const split = part.text.trim().split('\n\n\n')
    const last = split[split.length - 1]
    if (!last) return undefined
    const match = last.match(/\*\*([\s\S]*?)\*\*\s*([\s\S]*?)\s*$/)
    const title = match ? match[1] : undefined
    const content = match ? match[2] : undefined
    return match ? { title: title, content: converter.makeHtml(content) } : undefined
}

