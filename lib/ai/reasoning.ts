import { UIMessage } from "ai"
import showdown from 'showdown'

const converter = new showdown.Converter({ tables: true })

export type ReasoningType = {
    title: string | undefined,
    content: string | undefined
}

export const reasoning = (m: UIMessage): ReasoningType | undefined => {
    const parts = m?.parts?.filter((part) => part.type === 'reasoning')
    if (!parts) return undefined
    for (const part of parts) {
        if (part.state === 'done') continue
        const split = part.text.trim().split('\n\n\n')
        const last = split[split.length - 1]
        if (!last) return { title: 'Pensando...', content: '' }
        const match = last.match(/\*\*([\s\S]*?)\*\*\s*([\s\S]*?)\s*$/)
        const title = match ? match[1] : undefined
        const content = match ? match[2] : undefined
        if (match) return { title, content: converter.makeHtml(content) }
        return { title: undefined, content: converter.makeHtml(last) }
    }
}

