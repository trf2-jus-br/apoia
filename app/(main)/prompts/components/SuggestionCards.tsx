import { Card, Row, Col } from 'react-bootstrap'
import { IAPromptList } from '@/lib/db/mysql-types'
import { FaseProcessual } from '@/lib/proc/combinacoes'

interface SuggestionCardsProps {
    faseAtual: string | undefined
    prompts: IAPromptList[]
    onPromptClick: (prompt: IAPromptList) => void
}

export function SuggestionCards({ faseAtual, prompts, onPromptClick }: SuggestionCardsProps) {
    if (!faseAtual) {
        return null
    }

    // Filtrar prompts que têm a fase atual no campo phase
    const promptsSugeridos = prompts
        .filter(prompt => {
            const phases = prompt.content?.phase
            return phases && Array.isArray(phases) && phases.includes(faseAtual)
        })
        .slice(0, 3) // Pegar apenas os 3 primeiros

    if (promptsSugeridos.length === 0) {
        return null
    }

    // Obter descrição legível da fase
    const faseInfo = Object.values(FaseProcessual).find(f => f.name === faseAtual)
    const faseDescricao = faseInfo?.descr || faseAtual

    return (
        <div className="mb-4">
            <h5 className="mb-3">
                <i className="fas fa-lightbulb text-warning me-2"></i>
                Sugestões para fase: <strong>{faseDescricao}</strong>
            </h5>
            <Row>
                {promptsSugeridos.map((prompt) => (
                    <Col key={prompt.id} md={4} className="mb-3">
                        <Card 
                            className="h-100 shadow-sm border-primary"
                            style={{ cursor: 'pointer' }}
                            onClick={() => onPromptClick(prompt)}
                        >
                            <Card.Body>
                                <Card.Title className="h6 mb-2">
                                    {prompt.name}
                                </Card.Title>
                                <Card.Text className="small text-muted mb-2">
                                    <strong>Autor:</strong> {prompt.content?.author || 'Desconhecido'}
                                </Card.Text>
                                {prompt.content?.prompt && (
                                    <Card.Text className="small">
                                        {prompt.content.prompt.substring(0, 100)}
                                        {prompt.content.prompt.length > 100 ? '...' : ''}
                                    </Card.Text>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    )
}
