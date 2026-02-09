'use client'

export function ActionButtons() {
    return (
        <div className="d-print-none px-3 py-3 border-bottom">
            <button onClick={() => window.history.back()} className="btn btn-secondary btn-sm ms-2">
                Voltar
            </button>
        </div>
    )
}
