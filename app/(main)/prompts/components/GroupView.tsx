'use client'

import { Container, Row, Col, Card, CardBody, CardTitle, CardText, Button } from "react-bootstrap"
import { IAPromptList } from "@/lib/db/mysql-types"
import { GrupoDeSinteseMap } from "@/lib/proc/combinacoes"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowLeft, faFileAlt } from "@fortawesome/free-solid-svg-icons"
import { useRouter } from "next/navigation"
import devLog from "@/lib/utils/log"
import { useModeUrl } from "@/lib/utils/use-mode-url"

interface GroupViewProps {
    groupSlug: string
    prompts: IAPromptList[]
    onPromptClick: (prompt: IAPromptList) => void
}

export function GroupView({ groupSlug, prompts, onPromptClick }: GroupViewProps) {
    const router = useRouter()
    const modeUrl = useModeUrl()
    
    // Encontra o grupo pelo slug
    const group = Object.values(GrupoDeSinteseMap).find(g => g.slug === groupSlug)

    if (!group) {
        return (
            <Container className="mt-4">
                <div className="alert alert-warning">Grupo nao encontrado</div>
            </Container>
        )
    }

    // Filtra os prompts que pertencem a este grupo
    const groupPrompts = prompts.filter(p => {
        if (!p.origin) return false
        const group = p.content?.group as any
        if (group) 
            devLog('Prompt', p.name, 'pertence ao grupo', group.slug)
        return group?.slug === groupSlug
    }).sort((a, b) => {
        const sortA = a.content?.sort ?? 0
        const sortB = b.content?.sort ?? 0
        return sortA - sortB
    })

    const handleBack = () => {
        router.push(modeUrl('/'))
    }

    return (
        <Container className="mt-4" fluid={false}>
            {/* Header */}
            <div className="mb-4">
                <h1 className="mb-1">{group.title}</h1>
                <p className="text-muted mb-0">{group.description}</p>
            </div>

            {/* Cards dos prompts do grupo */}
            {groupPrompts.length === 0 ? (
                <div className="alert alert-info">
                    Nenhum prompt disponivel neste grupo.
                </div>
            ) : (
                <Row className="g-4">
                    {groupPrompts.map((prompt) => {
                        return (
                            <Col key={prompt.id} md={6} lg={3}>
                                <Card 
                                    className="h-100 text-center cursor-pointer"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => onPromptClick(prompt)}
                                >
                                    <CardBody className="d-flex flex-column">
                                        <div className="mb-3">
                                            <FontAwesomeIcon
                                                icon={faFileAlt}
                                                size="3x"
                                                className={group.cor || 'text-primary'}
                                            />
                                        </div>
                                        <CardTitle className="h5 mb-3">
                                            <span className="alert-link">{prompt.name}</span>
                                        </CardTitle>
                                        {prompt.content?.author && prompt.content.author !== '-' && (
                                            <CardText className="text-body-tertiary flex-grow-1 small">
                                                Autor: {prompt.content.author}
                                            </CardText>
                                        )}
                                    </CardBody>
                                </Card>
                            </Col>
                        )
                    })}
                </Row>
            )}

            {/* Botao Voltar no final */}
            <div className="mt-4">
                <Button variant="outline-secondary" onClick={handleBack}>
                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                    Voltar
                </Button>
            </div>
        </Container>
    )
}
