interface PromptDividerProps {
    label: string
}

/**
 * Divisor horizontal com label centralizada, usado para separar
 * grupos de prompts (sugeridos vs. demais) na interface do sidekick.
 */
export function PromptDivider({ label }: PromptDividerProps) {
    return (
        <div className="d-flex align-items-center w-100 gap-2 text-muted small mt-3 mb-2">
            <div className="flex-grow-1 border-top" />
            <span style={{ whiteSpace: "nowrap" }}>{label}</span>
            <div className="flex-grow-1 border-top" />
        </div>
    )
}
