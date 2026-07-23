import { IAPromptList } from "@/lib/db/mysql-types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEdit } from "@fortawesome/free-solid-svg-icons"

interface PromptHeaderProps {
    prompt: IAPromptList
    onPromptChange: () => void
    variant?: 'title' | 'header'
}

export function PromptHeader({ prompt, onPromptChange, variant = 'title' }: PromptHeaderProps) {
    if (variant === 'header') {
        return (
            <div className="text-center">
                <span className="h3">{prompt.name}</span> -{' '}
                <button type="button" className="btn btn-link p-0" onClick={onPromptChange} style={{ marginTop: "-.35em" }}>
                    <span className="text-primary"><FontAwesomeIcon icon={faEdit} /> Alterar</span>
                </button>
            </div>
        )
    }

    return (
        <div className="text-body-tertiary text-center h-print">
            Prompt: {prompt.name} -{' '}
            <button type="button" className="btn btn-link p-0" style={{ marginTop: "-.35em" }} onClick={onPromptChange}>
                <span className="text-primary"><FontAwesomeIcon icon={faEdit} /> Alterar</span>
            </button>
        </div>
    )
}
