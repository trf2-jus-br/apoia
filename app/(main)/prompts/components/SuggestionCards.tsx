import { Card, Row, Col } from 'react-bootstrap'
import { IAPromptList } from '@/lib/db/mysql-types'
import { FaseProcessual } from '@/lib/proc/combinacoes'

interface SuggestionCardsProps {
    faseAtual: string | undefined
    promptsSugeridos: IAPromptList[]
    onPromptClick: (prompt: IAPromptList) => void
}

export function SuggestionCards({ faseAtual, promptsSugeridos, onPromptClick }: SuggestionCardsProps) {
    if (!faseAtual || promptsSugeridos?.length === 0) {
        return null
    }

    // Obter descrição legível da fase
    const faseInfo = Object.values(FaseProcessual).find(f => f.name === faseAtual)
    const faseDescricao = faseInfo?.descr || faseAtual

    return (
        <div>
            <Row className="row row-cols-1 row-cols-md-1 g-4">
                {promptsSugeridos.map((prompt) => (
                    <Col key={prompt.id} md={4}>
                        <Card
                            className="h-100 shadow-sm border-primary btn btn-outline-primary"
                            style={{ cursor: 'pointer' }}
                            onClick={() => onPromptClick(prompt)}
                        >
                            <Card.Header className="bg-transparent border-0 pt-1 pb-0">
                                <Card.Title className="h6 mb-0">
                                    {prompt.name}
                                </Card.Title>
                            </Card.Header>
                            <Card.Body className="p-1">
                                {prompt.content?.description && (
                                    <Card.Text className="small">
                                        {prompt.content.description.substring(0, 100)}
                                        {prompt.content.description.length > 100 ? '...' : ''}
                                    </Card.Text>
                                )}
                            </Card.Body>
                            {/* <Card.Footer className="bg-transparent border-0 pt-0 pb-0">
                                <Card.Text className="small text-muted mb-2">
                                    {prompt.content?.author || 'Desconhecido'}
                                </Card.Text>
                            </Card.Footer> */}
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    )
}
