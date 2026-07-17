'use client'

import React, { useState, useEffect, use } from 'react'
import { Container, Row, Col, Card, Spinner, Alert, Table, OverlayTrigger, Tooltip as BsTooltip } from 'react-bootstrap'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faClock, faRocket, faLightbulb, faUsers, faStar,
    faTrophy, faHeart, faFire, faThumbsUp, faInfoCircle, faLock,
    faChartLine
} from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { STATS_CONFIG } from '@/lib/utils/stats-config'
import ModeLink from '@/components/mode-link'

interface UserStats {
    userId: number
    totalExecutions: number
    hoursSaved: number
    promptsCreatedCount: number
    communityUsageCount: number
    executionsByMonth: MonthlyExecutionItem[]
    badges: UserBadges
    myPromptsStats: MyPromptStatsItem[]
}

interface MonthlyExecutionItem {
    year: number
    month: number
    count: number
}

interface UserBadges {
    inicipiante: boolean
    powerUser: boolean
    criador: boolean
    influenciador: boolean
    cincoEstrelas: boolean
    curador: boolean
    popular: boolean
}

interface MyPromptStatsItem {
    promptBaseId: number
    promptName: string
    executionsByOthers: number
    avgStars: number | null
    totalRatings: number
}

interface BadgeInfo {
    key: keyof UserBadges
    name: string
    description: string
    icon: any
    color: string
    bgColor: string
}

const BADGES: BadgeInfo[] = [
    { key: 'inicipiante', name: 'O Iniciado', description: 'Executou o primeiro prompt', icon: faRocket, color: 'success', bgColor: '#d1e7dd' },
    { key: 'powerUser', name: 'Power User', description: 'Realizou mais de 100 execucoes', icon: faFire, color: 'danger', bgColor: '#f8d7da' },
    { key: 'criador', name: 'Criador', description: 'Criou o primeiro prompt publico', icon: faLightbulb, color: 'warning', bgColor: '#fff3cd' },
    { key: 'influenciador', name: 'Influenciador', description: 'Prompt executado 50+ vezes por terceiros', icon: faUsers, color: 'info', bgColor: '#cff4fc' },
    { key: 'cincoEstrelas', name: 'Cinco Estrelas', description: 'Recebeu avaliacao de 5 estrelas', icon: faStar, color: 'purple', bgColor: '#e2d9f3' },
    { key: 'curador', name: 'Curador', description: 'Avaliou 20+ prompts da comunidade', icon: faThumbsUp, color: 'primary', bgColor: '#cfe2ff' },
    { key: 'popular', name: 'Popular', description: 'Prompt favoritado por 10+ pessoas', icon: faHeart, color: 'pink', bgColor: '#f8d7da' },
]

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function UserStatsPage({ params }: { params: Promise<{ userId: string }> }) {
    const resolvedParams = use(params)
    const [stats, setStats] = useState<UserStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadStats() {
            try {
                const res = await fetch(`/api/v1/stats/user/${resolvedParams.userId}`)
                if (!res.ok) {
                    throw new Error(await res.text())
                }
                const data = await res.json()
                setStats(data)
            } catch (e: any) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        loadStats()
    }, [resolvedParams.userId])

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </Spinner>
                <p className="mt-3 text-muted">Carregando suas estatisticas...</p>
            </Container>
        )
    }

    if (error) {
        return (
            <Container className="py-5">
                <Alert variant="danger">
                    <Alert.Heading>Erro ao carregar estatisticas</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            </Container>
        )
    }

    if (!stats) {
        return (
            <Container className="py-5">
                <Alert variant="warning">Nenhuma estatistica disponivel.</Alert>
            </Container>
        )
    }

    // Preparar dados do gráfico de linha
    const chartData = stats.executionsByMonth.map(item => ({
        name: `${MONTH_NAMES[item.month - 1]}/${item.year.toString().slice(-2)}`,
        execucoes: item.count
    }))

    // Calcular dias equivalentes economizados
    const daysEquivalent = (stats.hoursSaved / 8).toFixed(1) // 8 horas por dia

    // Contar badges conquistados
    const badgesEarned = BADGES.filter(b => stats.badges[b.key]).length

    return (
        <Container className="py-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>
                    <FontAwesomeIcon icon={faTrophy} className="me-2 text-warning" />
                    Meu Impacto
                </h1>
                <ModeLink prefetch={false} href="/stats/global" className="btn btn-outline-primary">
                    Ver Hub da Comunidade
                </ModeLink>
            </div>

            {/* Productivity Section */}
            <Card className="mb-4 shadow-sm border-primary">
                <Card.Body className="text-center py-4">
                    <h2 className="display-4 text-primary fw-bold">
                        <FontAwesomeIcon icon={faClock} className="me-2" />
                        {stats.hoursSaved.toLocaleString('pt-BR')} horas
                    </h2>
                    <p className="lead text-muted mb-0">de trabalho economizadas</p>
                    <p className="text-muted">
                        Isso equivale a aproximadamente <strong className="text-primary">{daysEquivalent} dias</strong> de trabalho!
                        <OverlayTrigger
                            placement="top"
                            overlay={<BsTooltip>Calculado considerando que cada utilização da IA economiza {STATS_CONFIG.TEMPO_MEDIO_ECONOMIA_POR_EXECUCAO_MINUTOS} minutos ao usuário (tempo medio estimado)</BsTooltip>}
                        >
                            <FontAwesomeIcon icon={faInfoCircle} className="ms-2 text-secondary" style={{ cursor: 'help' }} />
                        </OverlayTrigger>
                    </p>
                </Card.Body>
            </Card>

            {/* Stats Cards */}
            <Row className="g-3 mb-4">
                <Col sm={6} lg={3}>
                    <Card className="h-100 text-center shadow-sm">
                        <Card.Body>
                            <FontAwesomeIcon icon={faRocket} size="2x" className="text-primary mb-2" />
                            <h3 className="display-6 fw-bold">{stats.totalExecutions.toLocaleString('pt-BR')}</h3>
                            <p className="text-muted mb-0">
                                Minhas Execucoes
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<BsTooltip>Total de prompts que voce executou desde o inicio</BsTooltip>}
                                >
                                    <FontAwesomeIcon icon={faInfoCircle} className="ms-1 text-secondary" style={{ cursor: 'help', fontSize: '0.75rem' }} />
                                </OverlayTrigger>
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col sm={6} lg={3}>
                    <Card className="h-100 text-center shadow-sm">
                        <Card.Body>
                            <FontAwesomeIcon icon={faLightbulb} size="2x" className="text-warning mb-2" />
                            <h3 className="display-6 fw-bold">{stats.promptsCreatedCount}</h3>
                            <p className="text-muted mb-0">
                                Prompts Criados
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<BsTooltip>Prompts publicos que voce criou e estao disponiveis para a comunidade</BsTooltip>}
                                >
                                    <FontAwesomeIcon icon={faInfoCircle} className="ms-1 text-secondary" style={{ cursor: 'help', fontSize: '0.75rem' }} />
                                </OverlayTrigger>
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col sm={6} lg={3}>
                    <Card className="h-100 text-center shadow-sm">
                        <Card.Body>
                            <FontAwesomeIcon icon={faUsers} size="2x" className="text-success mb-2" />
                            <h3 className="display-6 fw-bold">{stats.communityUsageCount.toLocaleString('pt-BR')}</h3>
                            <p className="text-muted mb-0">
                                Uso pela Comunidade
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<BsTooltip>Quantas vezes outros usuarios executaram seus prompts publicos</BsTooltip>}
                                >
                                    <FontAwesomeIcon icon={faInfoCircle} className="ms-1 text-secondary" style={{ cursor: 'help', fontSize: '0.75rem' }} />
                                </OverlayTrigger>
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col sm={6} lg={3}>
                    <Card className="h-100 text-center shadow-sm">
                        <Card.Body>
                            <FontAwesomeIcon icon={faTrophy} size="2x" className="text-info mb-2" />
                            <h3 className="display-6 fw-bold">{badgesEarned}/{BADGES.length}</h3>
                            <p className="text-muted mb-0">
                                Conquistas
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<BsTooltip>Badges conquistados com base em suas atividades e contribuicoes</BsTooltip>}
                                >
                                    <FontAwesomeIcon icon={faInfoCircle} className="ms-1 text-secondary" style={{ cursor: 'help', fontSize: '0.75rem' }} />
                                </OverlayTrigger>
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Charts and Badges */}
            <Row className="g-4 mb-4">
                {/* Monthly Executions Chart */}
                <Col lg={7}>
                    <Card className="h-100 shadow-sm">
                        <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <FontAwesomeIcon icon={faChartLine} className="me-2 text-primary" />
                                Minhas Execucoes nos Ultimos 6 Meses</h5>
                            <OverlayTrigger
                                placement="top"
                                overlay={<BsTooltip>Historico mensal de quantos prompts voce executou</BsTooltip>}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help' }} />
                            </OverlayTrigger>
                        </Card.Header>
                        <Card.Body>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Execucoes']} />
                                        <Line
                                            type="monotone"
                                            dataKey="execucoes"
                                            stroke="#0d6efd"
                                            strokeWidth={2}
                                            dot={{ fill: '#0d6efd', strokeWidth: 2 }}
                                            activeDot={{ r: 8 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-muted text-center py-5">Nenhum dado de execucao disponivel.</p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Badges */}
                <Col lg={5}>
                    <Card className="h-100 shadow-sm">
                        <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <FontAwesomeIcon icon={faTrophy} className="me-2 text-warning" />
                                Minhas Conquistas
                            </h5>
                            <OverlayTrigger
                                placement="top"
                                overlay={<BsTooltip>Badges que reconhecem suas contribuicoes: primeiro prompt, 100+ execucoes, prompt publico, etc.</BsTooltip>}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help' }} />
                            </OverlayTrigger>
                        </Card.Header>
                        <Card.Body>
                            <Row className="g-2">
                                {BADGES.map((badge) => {
                                    const earned = stats.badges[badge.key]
                                    const colorMap: Record<string, string> = {
                                        'success': '#198754',
                                        'danger': '#dc3545',
                                        'warning': '#ffc107',
                                        'info': '#0dcaf0',
                                        'primary': '#0d6efd',
                                        'purple': '#6f42c1',
                                        'pink': '#d63384'
                                    }
                                    const iconColor = colorMap[badge.color] || badge.color
                                    return (
                                        <Col key={badge.key} xs={6}>
                                            <OverlayTrigger
                                                placement="top"
                                                overlay={<BsTooltip>{badge.description}{!earned && ' (bloqueado)'}</BsTooltip>}
                                            >
                                                <Card
                                                    className={`h-100 text-center ${earned ? '' : 'bg-light'}`}
                                                    style={{
                                                        borderColor: earned ? iconColor : '#dee2e6',
                                                        backgroundColor: earned ? badge.bgColor : undefined,
                                                        cursor: 'help'
                                                    }}
                                                >
                                                    <Card.Body className="py-2 px-1">
                                                        <FontAwesomeIcon
                                                            icon={earned ? badge.icon : faLock}
                                                            size="lg"
                                                            style={{ color: earned ? iconColor : '#adb5bd' }}
                                                        />
                                                        <p className={`small mb-0 mt-1 ${earned ? 'fw-semibold' : 'text-muted'}`}>
                                                            {badge.name}
                                                        </p>
                                                    </Card.Body>
                                                </Card>
                                            </OverlayTrigger>
                                        </Col>
                                    )
                                })}
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* My Prompts Performance */}
            {false && stats.myPromptsStats.length > 0 && (
                <Card className="shadow-sm">
                    <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
                        <div>
                            <h5 className="mb-0">
                                <FontAwesomeIcon icon={faHeart} className="me-2 text-danger" />
                                Feedback da Comunidade
                            </h5>
                            <small className="text-muted">Como seus prompts estao ajudando outros usuarios</small>
                        </div>
                        <OverlayTrigger
                            placement="top"
                            overlay={<BsTooltip>Estatisticas de uso e avaliacao dos prompts publicos que voce criou</BsTooltip>}
                        >
                            <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help' }} />
                        </OverlayTrigger>
                    </Card.Header>
                    <Card.Body>
                        <Table responsive hover className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Prompt</th>
                                    <th className="text-center">Execucoes por Outros</th>
                                    <th className="text-center">Media de Estrelas</th>
                                    <th className="text-center">Total de Avaliacoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.myPromptsStats.map((prompt) => (
                                    <tr key={prompt.promptBaseId}>
                                        <td>
                                            <ModeLink prefetch={false}
                                                href={`/prompts?prompt_id=${prompt.promptBaseId}`}
                                                className="text-decoration-none"
                                            >
                                                {prompt.promptName}
                                            </ModeLink>
                                        </td>
                                        <td className="text-center">
                                            <span className="badge bg-primary rounded-pill">
                                                {prompt.executionsByOthers.toLocaleString('pt-BR')}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            {prompt.avgStars ? (
                                                <span className="text-warning">
                                                    <FontAwesomeIcon icon={faStar} className="me-1" />
                                                    {prompt.avgStars.toFixed(1)}
                                                </span>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="text-center text-muted">
                                            {prompt.totalRatings > 0 ? prompt.totalRatings : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}
        </Container>
    )
}
