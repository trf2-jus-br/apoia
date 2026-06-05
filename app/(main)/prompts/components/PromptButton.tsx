import { Button } from "react-bootstrap"
import { IAPromptList } from "@/lib/db/mysql-types"

interface PromptButtonProps {
    prompt: IAPromptList
    index: number
    onClick: (prompt: IAPromptList) => void
}

/**
 * Botão de prompt no padrão visual usado no sidekick.
 * Recebe um índice para gerar uma cor HSL estável e única para o botão.
 */
export function PromptButton({ prompt, index, onClick }: PromptButtonProps) {
    const hue = 30 + ((index % 14) / 13) * (330 - 30)
    return (
        <Button
            onClick={() => onClick(prompt)}
            variant="light"
            style={{
                borderColor: `hsl(${hue}, 85%, 40%)`,
                color: `hsl(${hue}, 85%, 30%)`,
            }}
            title={prompt?.content?.description}
        >
            {prompt.name}
        </Button>
    )
}
