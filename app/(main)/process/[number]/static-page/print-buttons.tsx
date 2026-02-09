'use client'

export function PrintButtons() {
    return (
        <div className="d-print-none" style={{ padding: '20px', borderBottom: '1px solid #ddd' }}>
            <button onClick={() => window.history.back()} className="btn btn-secondary btn-sm ms-2">
                Voltar
            </button>
        </div>
    )
}
