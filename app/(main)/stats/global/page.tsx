'use client'

import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Spinner, Alert, OverlayTrigger, Tooltip as BsTooltip } from 'react-bootstrap'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faClock, faUsers, faBuilding, faStar, faTrophy, faFire, faLightbulb, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { STATS_CONFIG } from '@/lib/utils/stats-config'

interface GlobalStats {
    totalExecutions: number
    totalHoursSaved: number
    totalActiveUsers: number
    totalCourts: number
    courtRanking: CourtRankingItem[]
    topContributors: TopContributorItem[]
    topUsers: TopUserItem[]
    trendingPrompts: TrendingPromptItem[]
}

interface CourtRankingItem {
    courtId: number
    sigla: string
    nome: string
    totalExecutions: number
}

interface TopContributorItem {
    userId: number
    name: string
    username: string
    courtSigla: string | null
    totalExecutions: number
    avgStars: number
    totalRatings: number
    score: number
}

interface TopUserItem {
    userId: number
    name: string
    username: string
    courtSigla: string | null
    totalExecutions: number
}

interface TrendingPromptItem {
    promptBaseId: number
    promptName: string
    authorName: string | null
    executionsLast30Days: number
    avgStars: number | null
    totalRatings: number
}

const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1']

export default function GlobalStatsPage() {
    const [stats, setStats] = useState<GlobalStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadStats() {
            try {
                const res = await fetch('/api/v1/stats/global')
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
    }, [])

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </Spinner>
                <p className="mt-3 text-muted">Carregando estatísticas da comunidade...</p>
            </Container>
        )
    }

    if (error) {
        return (
            <Container className="py-5">
                <Alert variant="danger">
                    <Alert.Heading>Erro ao carregar estatísticas</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            </Container>
        )
    }

    if (!stats) {
        return (
            <Container className="py-5">
                <Alert variant="warning">Nenhuma estatística disponível.</Alert>
            </Container>
        )
    }

    const chartData = stats.courtRanking.map(court => ({
        name: court.sigla,
        executions: court.totalExecutions,
        fullName: court.nome
    }))

    // Calcular dias equivalentes economizados (8 horas por dia)
    const daysEquivalent = (stats.totalHoursSaved / 8).toFixed(1)

    return (
        <Container className="py-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>
                    <FontAwesomeIcon icon={faUsers} className="me-2 text-primary" />
                    Hub da Comunidade
                </h1>
                <Link href="/stats/user/me" className="btn btn-outline-primary">
                    Ver Meu Impacto Pessoal
                </Link>
            </div>

            {/* Hero - Impacto Total */}
            <Card className="mb-4 shadow-sm border-primary">
                <Card.Body className="text-center py-4">
                    <h2 className="display-4 text-primary fw-bold">
                        <FontAwesomeIcon icon={faClock} className="me-2" />
                        {stats.totalHoursSaved.toLocaleString('pt-BR')} horas
                    </h2>
                    <p className="lead text-muted mb-0">de trabalho economizadas pela comunidade</p>
                    <p className="text-muted">
                        Isso equivale a aproximadamente <strong className="text-primary">{daysEquivalent} dias</strong> de trabalho!
                        <OverlayTrigger
                            placement="top"
                            overlay={<BsTooltip>Calculado considerando que cada utilização da IA economiza {STATS_CONFIG.TEMPO_MEDIO_ECONOMIA_POR_EXECUCAO_MINUTOS} minutos ao usuário (tempo médio estimado)</BsTooltip>}
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
                                Processos Acelerados
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<BsTooltip>Total de execuções de prompts desde o início da plataforma</BsTooltip>}
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
                            <h3 className="display-6 fw-bold">{stats.trendingPrompts.length}</h3>
                            <p className="text-muted mb-0">
                                Prompts em Alta
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<BsTooltip>Prompts públicos mais executados nos últimos 30 dias</BsTooltip>}
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
                            <h3 className="display-6 fw-bold">{stats.totalActiveUsers.toLocaleString('pt-BR')}</h3>
                            <p className="text-muted mb-0">
                                Usuários Ativos
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<BsTooltip>Usuários que executaram pelo menos um prompt nos últimos 30 dias</BsTooltip>}
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
                            <FontAwesomeIcon icon={faBuilding} size="2x" className="text-info mb-2" />
                            <h3 className="display-6 fw-bold">{stats.totalCourts}</h3>
                            <p className="text-muted mb-0">
                                Tribunais Conectados
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<BsTooltip>Número de tribunais distintos com usuários cadastrados</BsTooltip>}
                                >
                                    <FontAwesomeIcon icon={faInfoCircle} className="ms-1 text-secondary" style={{ cursor: 'help', fontSize: '0.75rem' }} />
                                </OverlayTrigger>
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Row 1: Ranking de Tribunais + Prompts em Alta */}
            <Row className="g-4 mb-4">
                {/* Court Ranking Chart */}
                <Col lg={6}>
                    <Card className="h-100 shadow-sm">
                        <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <FontAwesomeIcon icon={faTrophy} className="me-2 text-warning" />
                                Ranking de Tribunais
                            </h5>
                            <OverlayTrigger
                                placement="top"
                                overlay={<BsTooltip>Total histórico de execuções de prompts por tribunal</BsTooltip>}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help' }} />
                            </OverlayTrigger>
                        </Card.Header>
                        <Card.Body>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={550}>
                                    <BarChart
                                        data={chartData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={55}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <Tooltip
                                            formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Execuções']}
                                            labelFormatter={(label) => {
                                                const court = chartData.find(c => c.name === label)
                                                return court?.fullName || label
                                            }}
                                        />
                                        <Bar dataKey="executions" name="Execuções" radius={[0, 4, 4, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-muted text-center py-5">Nenhum dado de tribunal disponível.</p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Trending Prompts */}
                <Col lg={6}>
                    <Card className="h-100 shadow-sm">
                        <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <FontAwesomeIcon icon={faFire} className="me-2 text-danger" />
                                Prompts em Alta
                            </h5>
                            <OverlayTrigger
                                placement="top"
                                overlay={<BsTooltip>Prompts públicos mais executados nos últimos 30 dias</BsTooltip>}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help' }} />
                            </OverlayTrigger>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {stats.trendingPrompts.length > 0 ? (
                                <ul className="list-group list-group-flush">
                                    {stats.trendingPrompts.map((prompt, index) => (
                                        <li key={prompt.promptBaseId} className="list-group-item d-flex align-items-center py-1">
                                            <div className="me-3 text-center" style={{ width: '40px' }}>
                                                {index === 0 && <span className="fs-3">🥇</span>}
                                                {index === 1 && <span className="fs-3">🥈</span>}
                                                {index === 2 && <span className="fs-3">🥉</span>}
                                                {index > 2 && (
                                                    <span className="badge bg-secondary rounded-circle fs-6" style={{ width: '32px', height: '32px', lineHeight: '22px' }}>
                                                        {index + 1}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-grow-1">
                                                <Link
                                                    href={`/prompts?prompt_id=${prompt.promptBaseId}`}
                                                    className="text-decoration-none fw-semibold"
                                                >
                                                    {prompt.promptName}
                                                </Link>
                                                <br />
                                                <small className="text-muted">
                                                    {prompt.authorName || 'Desconhecido'}
                                                    <span className="mx-1">-</span>
                                                    {prompt.executionsLast30Days.toLocaleString('pt-BR')} execuções
                                                </small>
                                            </div>
                                            {prompt.avgStars && prompt.avgStars > 0 && (
                                                <div className="text-end">
                                                    <span className="badge bg-warning text-dark">
                                                        <FontAwesomeIcon icon={faStar} className="me-1" />
                                                        {prompt.avgStars.toFixed(1)}
                                                    </span>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted text-center py-5">Nenhum prompt em alta no momento.</p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Row 2: Autores em Destaque + Usuarios em Destaque */}
            <Row className="g-4 mb-4">
                {/* Top Contributors */}
                <Col lg={6}>
                    <Card className="h-100 shadow-sm">
                        <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <FontAwesomeIcon icon={faLightbulb} className="me-2 text-warning" />
                                Autores em Destaque
                            </h5>
                            <OverlayTrigger
                                placement="top"
                                overlay={<BsTooltip>Autores de prompts públicos com mais execuções e avaliações nos últimos 30 dias</BsTooltip>}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help' }} />
                            </OverlayTrigger>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {stats.topContributors.length > 0 ? (
                                <ul className="list-group list-group-flush">
                                    {stats.topContributors.map((contributor, index) => (
                                        <li key={contributor.userId} className="list-group-item d-flex align-items-center py-1">
                                            <div className="me-3 text-center" style={{ width: '40px' }}>
                                                {index === 0 && <span className="fs-3">🥇</span>}
                                                {index === 1 && <span className="fs-3">🥈</span>}
                                                {index === 2 && <span className="fs-3">🥉</span>}
                                                {index > 2 && (
                                                    <span className="badge bg-secondary rounded-circle fs-6" style={{ width: '32px', height: '32px', lineHeight: '22px' }}>
                                                        {index + 1}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className="fw-semibold">
                                                    {contributor.name}
                                                </div>
                                                <small className="text-muted">
                                                    {contributor.courtSigla && <span className="me-1">{contributor.courtSigla}</span>}
                                                    {contributor.courtSigla && <span className="me-1">-</span>}
                                                    {contributor.totalExecutions.toLocaleString('pt-BR')} execuções
                                                </small>
                                            </div>
                                            {contributor.avgStars > 0 && (
                                                <div className="text-end">
                                                    <span className="badge bg-warning text-dark">
                                                        <FontAwesomeIcon icon={faStar} className="me-1" />
                                                        {contributor.avgStars.toFixed(1)}
                                                    </span>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted text-center py-5">Nenhum contribuidor encontrado.</p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Top Users */}
                <Col lg={6}>
                    <Card className="h-100 shadow-sm">
                        <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <FontAwesomeIcon icon={faStar} className="me-2 text-primary" />
                                Usuários em Destaque
                            </h5>
                            <OverlayTrigger
                                placement="top"
                                overlay={<BsTooltip>Usuários com mais execuções de prompts nos últimos 30 dias</BsTooltip>}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help' }} />
                            </OverlayTrigger>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {stats.topUsers.length > 0 ? (
                                <ul className="list-group list-group-flush">
                                    {stats.topUsers.map((user, index) => (
                                        <li key={user.userId} className="list-group-item d-flex align-items-center py-1">
                                            <div className="me-3 text-center" style={{ width: '40px' }}>
                                                {index === 0 && <span className="fs-3">🥇</span>}
                                                {index === 1 && <span className="fs-3">🥈</span>}
                                                {index === 2 && <span className="fs-3">🥉</span>}
                                                {index > 2 && (
                                                    <span className="badge bg-secondary rounded-circle fs-6" style={{ width: '32px', height: '32px', lineHeight: '22px' }}>
                                                        {index + 1}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className="fw-semibold">
                                                    {user.name}
                                                </div>
                                                <small className="text-muted">
                                                    {user.courtSigla && <span className="me-1">{user.courtSigla}</span>}
                                                    {user.courtSigla && <span className="me-1">-</span>}
                                                    {user.totalExecutions.toLocaleString('pt-BR')} execuções
                                                </small>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted text-center py-5">Nenhum usuário encontrado.</p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    )
}
