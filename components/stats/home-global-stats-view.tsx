'use client'

import { Row, Col, OverlayTrigger, Tooltip as BsTooltip } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faRocket, faUsers, faBuilding, faTrophy, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { STATS_CONFIG } from '@/lib/utils/stats-config'
import { MiniCourtChart } from './home-global-stats-chart'
import ModeLink from '../mode-link'

interface HomeGlobalStatsViewProps {
    stats: any
}

export function HomeGlobalStatsView({ stats }: HomeGlobalStatsViewProps) {
    let ranking = stats.courtRanking || []

    // Mock data se houver menos de 5 tribunais
    // if (ranking.length < 5) {
    //     ranking = [
    //         { sigla: 'TRF2', nome: 'Tribunal Regional Federal da 2ª Região', totalExecutions: 2821 },
    //         { sigla: 'TRF3', nome: 'Tribunal Regional Federal da 3ª Região', totalExecutions: 1540 },
    //         { sigla: 'TRF4', nome: 'Tribunal Regional Federal da 4ª Região', totalExecutions: 1200 },
    //         { sigla: 'TRF5', nome: 'Tribunal Regional Federal da 5ª Região', totalExecutions: 940 },
    //         { sigla: 'TRF1', nome: 'Tribunal Regional Federal da 1ª Região', totalExecutions: 830 },
    //         { sigla: 'TRF6', nome: 'Tribunal Regional Federal da 6ª Região', totalExecutions: 650 },
    //         { sigla: 'TJSP', nome: 'Tribunal de Justiça de São Paulo', totalExecutions: 410 },
    //         { sigla: 'TJRJ', nome: 'Tribunal de Justiça do Rio de Janeiro', totalExecutions: 290 },
    //         { sigla: 'TJMS', nome: 'Tribunal de Justiça do Mato Grosso do Sul', totalExecutions: 120 },
    //         { sigla: 'TJRS', nome: 'Tribunal de Justiça do Rio Grande do Sul', totalExecutions: 80 }
    //     ].sort((a, b) => b.totalExecutions - a.totalExecutions)
    // }

    const top5 = ranking.slice(0, 5).map((court: any) => ({
        name: court.sigla,
        executions: court.totalExecutions,
        fullName: court.nome
    }))

    const othersSum = ranking.slice(5).reduce((sum: number, court: any) => sum + court.totalExecutions, 0)
    const chartData = othersSum > 0
        ? [...top5, { name: 'Outros', executions: othersSum, fullName: 'Demais Tribunais' }]
        : top5

    return (
        <Row className="g-3 align-items-stretch">
            <Col md={2} className="text-center border-end">
                <ModeLink prefetch={false} href="/stats/global" className="text-decoration-none text-dark d-flex flex-column h-100">
                    <div className="flex-grow-1 d-flex flex-column justify-content-center">
                        <div className="text-primary mb-1">
                            <FontAwesomeIcon icon={faClock} size="lg" />
                        </div>
                        <h4 className="fw-bold mb-0 text-primary">
                            {Math.round(stats.totalHoursSaved).toLocaleString('pt-BR')}
                        </h4>
                    </div>
                    <div className="mt-auto pt-2">
                        <small className="text-muted d-flex align-items-center justify-content-center gap-1" style={{ lineHeight: '1.1' }}>
                            Horas Poupadas
                            <OverlayTrigger
                                placement="top"
                                overlay={<BsTooltip>Calculado considerando que cada utilização da IA economiza {STATS_CONFIG.TEMPO_MEDIO_ECONOMIA_POR_EXECUCAO_MINUTOS} minutos ao usuário (tempo médio estimado)</BsTooltip>}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help', fontSize: '0.75rem' }} />
                            </OverlayTrigger>
                        </small>
                    </div>
                </ModeLink>
            </Col>

            <Col md={2} className="text-center border-end">
                <ModeLink prefetch={false} href="/stats/global" className="text-decoration-none text-dark d-flex flex-column h-100">
                    <div className="flex-grow-1 d-flex flex-column justify-content-center">
                        <div className="text-info mb-1">
                            <FontAwesomeIcon icon={faRocket} size="lg" />
                        </div>
                        <h4 className="fw-bold mb-0 text-info">
                            {stats.totalExecutions.toLocaleString('pt-BR')}
                        </h4>
                    </div>
                    <div className="mt-auto pt-2">
                        <small className="text-muted d-flex align-items-center justify-content-center gap-1" style={{ lineHeight: '1.1' }}>
                            Processos Acelerados
                            <OverlayTrigger
                                placement="top"
                                overlay={<BsTooltip>Total de execuções de prompts desde o início da plataforma</BsTooltip>}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help', fontSize: '0.75rem' }} />
                            </OverlayTrigger>
                        </small>
                    </div>
                </ModeLink>
            </Col>

            <Col md={2} className="text-center border-end">
                <ModeLink prefetch={false} href="/stats/global" className="text-decoration-none text-dark d-flex flex-column h-100">
                    <div className="flex-grow-1 d-flex flex-column justify-content-center">
                        <div className="text-success mb-1">
                            <FontAwesomeIcon icon={faUsers} size="lg" />
                        </div>
                        <h4 className="fw-bold mb-0 text-success">
                            {stats.totalActiveUsers.toLocaleString('pt-BR')}
                        </h4>
                    </div>
                    <div className="mt-auto pt-2">
                        <small className="text-muted d-flex align-items-center justify-content-center gap-1" style={{ lineHeight: '1.1' }}>
                            Usuários Ativos
                            <OverlayTrigger
                                placement="top"
                                overlay={<BsTooltip>Usuários que executaram pelo menos um prompt nos últimos 30 dias</BsTooltip>}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help', fontSize: '0.75rem' }} />
                            </OverlayTrigger>
                        </small>
                    </div>
                </ModeLink>
            </Col>

            <Col md={2} className="text-center border-end">
                <ModeLink prefetch={false} href="/stats/global" className="text-decoration-none text-dark d-flex flex-column h-100">
                    <div className="flex-grow-1 d-flex flex-column justify-content-center">
                        <div className="text-warning mb-1">
                            <FontAwesomeIcon icon={faBuilding} size="lg" />
                        </div>
                        <h4 className="fw-bold mb-0 text-warning">
                            {stats.totalCourts.toLocaleString('pt-BR')}
                        </h4>
                    </div>
                    <div className="mt-auto pt-2">
                        <small className="text-muted d-flex align-items-center justify-content-center gap-1" style={{ lineHeight: '1.1' }}>
                            Tribunais Conectados
                            <OverlayTrigger
                                placement="top"
                                overlay={<BsTooltip>Número de tribunais distintos com usuários cadastrados</BsTooltip>}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help', fontSize: '0.75rem' }} />
                            </OverlayTrigger>
                        </small>
                    </div>
                </ModeLink>
            </Col>

            <Col md={4} className="text-center pe-4">
                <ModeLink prefetch={false} href="/stats/global" className="text-decoration-none w-100 text-dark d-flex flex-column h-100">
                    <div className="flex-grow-1 d-flex flex-column justify-content-center">
                        <MiniCourtChart data={chartData} />
                    </div>
                    <div className="mt-auto pt-2">
                        <small className="text-muted d-flex align-items-center justify-content-center gap-1" style={{ lineHeight: '1.1' }}>
                            Ranking de Tribunais
                            <OverlayTrigger
                                placement="top"
                                overlay={<BsTooltip>Total histórico de execuções de prompts por tribunal</BsTooltip>}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="text-secondary" style={{ cursor: 'help', fontSize: '0.75rem' }} />
                            </OverlayTrigger>
                        </small>
                    </div>
                </ModeLink>
            </Col>
        </Row>
    )
}
