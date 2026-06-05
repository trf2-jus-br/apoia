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
            title={prompt?.content?.description}
        >
            {prompt.name}
        </Button>
    )
}
