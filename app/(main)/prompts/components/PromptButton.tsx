import { Button } from "react-bootstrap"
import { IAPromptList } from "@/lib/db/mysql-types"

type PromptButtonVariant = "default" | "suggested"

interface PromptButtonProps {
    prompt: IAPromptList
    index: number
    onClick: (prompt: IAPromptList) => void
    /**
     * "default"   — paleta HSL completa, saturação alta (favoritos).
     * "suggested" — mesma forma/tamanho, mas com paleta restrita a
     *               tons quentes (vermelho -> âmbar) em saturação mais
     *               baixa, para destacar sutilmente os sugeridos pelo
     *               sistema sem chamar mais atenção que o conteúdo.
     */
    variant?: PromptButtonVariant
}

/**
 * Quebra o texto em linhas de até `maxLen` caracteres, sempre em
 * fronteiras de palavra (espaço). Se uma palavra isolada for maior
 * que `maxLen`, ela é mantida inteira na sua própria linha.
 */
export function wrapTitle(text: string | undefined, maxLen: number = 30): string {
    if (!text) return ""
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length === 0) return ""

    const lines: string[] = []
    let current = ""

    for (const word of words) {
        if (!current) {
            current = word
            continue
        }
        // +1 para o espaço separador
        if (current.length + 1 + word.length <= maxLen) {
            current += " " + word
        } else {
            lines.push(current)
            current = word
        }
    }
    if (current) lines.push(current)
    return lines.join("\n")
}

/**
 * Botão de prompt no padrão visual usado no sidekick.
 * Recebe um índice para gerar uma cor HSL estável e única para o botão.
 */
export function PromptButton({ prompt, index, onClick, variant = "default" }: PromptButtonProps) {
    // Sugeridos: paleta quente (vermelho -> âmbar, hue 0..60),
    //            com saturação reduzida para um vermelho/laranja pastel.
    // Demais:    paleta completa, hue 30..360, saturação cheia.
    const isSuggested = variant === "suggested"
    const hue = isSuggested
        ? (index % 14) * (60 / 13)            // 0..60
        : 30 + ((index % 14) / 13) * (330 - 30) // 30..360
    const saturation = isSuggested ? 55 : 85
    const borderLightness = isSuggested ? 60 : 40
    const textLightness = isSuggested ? 40 : 30

    return (
        <Button
            onClick={() => onClick(prompt)}
            variant="light"
            style={{
                borderColor: `hsl(${hue}, ${saturation}%, ${borderLightness}%)`,
                color: `hsl(${hue}, ${saturation}%, ${textLightness}%)`,
            }}
            title={wrapTitle(prompt?.content?.description)}
        >
            {prompt.name}
        </Button>
    )
}
