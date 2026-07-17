import React from 'react';
import Link from 'next/link';
import CourtUsageChart from './CourtUsageChart';
import PeriodNavigation from './PeriodNavigation';
import { Container } from 'react-bootstrap';
import { UserDao } from '@/lib/db/dao';
import { CourtUsageData, UserUsageData, DailyUsageData } from '@/lib/db/mysql-types';
import { dailyLimits } from '@/lib/utils/limits';
import { displayUserName } from '@/lib/utils/utils';
import ModeLink from '@/components/mode-link';

export default async function DashboardPage(props) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const court_id: number = Number(params?.court?.toString());
    const month: string = params?.month?.toString();
    const userId: number | null = searchParams?.userId ? Number(searchParams.userId) : null;
    const { user_usage_count, user_usage_cost, court_usage_count, court_usage_cost } = dailyLimits(court_id);

    // Validate month format 'YYYY-MM(-DD)?'
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(month))
        throw new Error(`Data inicial inválida, esperava AAAA-MM ou AAAA-MM-DD, recebi ${month}.`);
    let [year, monthNumber, day] = month.split('-').map(Number);
    if (day === undefined) day = 1;
    const startDate = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let nextMonthYear = year;
    let nextMonthNumber = monthNumber + 1;
    if (nextMonthNumber > 12) {
        nextMonthNumber = 1;
        nextMonthYear += 1;
    }
    const endDate = `${nextMonthYear}-${String(nextMonthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // If userId is provided, show user detail view
    if (userId) {
        const dailyUsageData: DailyUsageData[] = await UserDao.retrieveUserDailyUsage(userId, court_id, startDate, endDate);
        const userInfo = await UserDao.retrieveUserMonthlyUsageByCourt(court_id, startDate, endDate);
        const currentUser = userInfo.find(u => Number(u.id) === userId);
        const userName = currentUser ? displayUserName(currentUser.name, currentUser.username) : `Usuário ${userId}`;

        const totalUsage = dailyUsageData.reduce((acc, curr) => acc + curr.usage_count, 0);
        const totalInputTokens = dailyUsageData.reduce((acc, curr) => acc + curr.input_tokens_count, 0);
        const totalOutputTokens = dailyUsageData.reduce((acc, curr) => acc + curr.output_tokens_count, 0);
        const totalCost = dailyUsageData.reduce((acc, curr) => acc + curr.approximate_cost, 0);

        return (
            <Container className='mt-5'>
                <div className="mb-3">
                    <ModeLink prefetch={false} href={`/dashboard/${court_id}/${month}`} className="btn btn-outline-secondary btn-sm">
                        ← Voltar para Visão Geral
                    </ModeLink>
                </div>

                <h1 className='mb-3 text-center'>Dados de Uso de {userName}</h1>
                <h5 className='mb-4 text-center text-muted'>Tribunal {court_id} em {month}</h5>

                <PeriodNavigation court_id={court_id} currentPeriod={month} userId={userId.toString()} />

                {dailyUsageData.length > 0 ? (
                    <>
                        <CourtUsageChart data={dailyUsageData} />

                        <div className="row mt-4">
                            <div className="col-md-3">
                                <h5>Consumo Total no Período</h5>
                                <ul>
                                    <li>Contagem de Uso: {totalUsage}</li>
                                    <li>Tokens Input: {totalInputTokens.toLocaleString()}</li>
                                    <li>Tokens Output: {totalOutputTokens.toLocaleString()}</li>
                                    <li>Custo Aproximado: ${totalCost.toFixed(2)}</li>
                                </ul>
                            </div>
                            <div className="col-md-3">
                                <h5>Médias</h5>
                                <ul>
                                    <li>Uso por Dia: {(totalUsage / Math.max(dailyUsageData.length, 1)).toFixed(1)}</li>
                                    <li>Tokens/Requisição: {totalUsage > 0 ? ((totalInputTokens + totalOutputTokens) / totalUsage).toFixed(0) : 0}</li>
                                    <li>Custo/Requisição: ${totalUsage > 0 ? (totalCost / totalUsage).toFixed(4) : '0.0000'}</li>
                                </ul>
                            </div>
                            <div className="col-md-3">
                                <h5>Limites Diários do Usuário</h5>
                                <ul>
                                    <li>Contagem de Uso: {user_usage_count || 'Ilimitado'}</li>
                                    <li>Custo Aproximado: ${user_usage_cost?.toFixed(2) || 'Ilimitado'}</li>
                                </ul>
                            </div>
                            <div className="col-md-3">
                                <h5>Maior Uso Diário</h5>
                                <ul>
                                    <li>Contagem: {Math.max(...dailyUsageData.map(d => d.usage_count))}</li>
                                    <li>Custo: ${Math.max(...dailyUsageData.map(d => d.approximate_cost)).toFixed(2)}</li>
                                </ul>
                            </div>
                        </div>

                        <h3 className="mt-5 mb-3">Detalhamento Diário</h3>
                        <table className="table table-striped table-sm table-bordered">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th style={{ textAlign: 'right' }}>Contagem de Uso</th>
                                    <th style={{ textAlign: 'right' }}>Tokens Input</th>
                                    <th style={{ textAlign: 'right' }}>Tokens Output</th>
                                    <th style={{ textAlign: 'right' }}>Custo Aprox. (Dólar)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyUsageData.map((day) => (
                                    <tr key={day.date}>
                                        <td>{new Date(day.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td style={{ textAlign: 'right' }}>{day.usage_count}</td>
                                        <td style={{ textAlign: 'right' }}>{day.input_tokens_count.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right' }}>{day.output_tokens_count.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right' }}>{day.approximate_cost.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div className="alert alert-info">
                        Não há dados disponíveis para este usuário no período selecionado.
                    </div>
                )}
            </Container>
        );
    }

    // Otherwise, show court overview
    const courtUsageData: CourtUsageData[] = await UserDao.retrieveCourtMonthlyUsage(court_id, startDate, endDate);
    const userUsageData: UserUsageData[] = await UserDao.retrieveUserMonthlyUsageByCourt(court_id, startDate, endDate);

    return (
        <Container className='mt-5'>
            <h1 className='mb-5 text-center'>Dados de Uso do Tribunal {court_id} em {month}</h1>

            <PeriodNavigation court_id={court_id} currentPeriod={month} />

            {courtUsageData.length > 0 && (<>
                <CourtUsageChart data={courtUsageData} />
                <div className="row">
                    <div className="col-md-4">
                        <h3 className="mt-4">Consumo Total no Mês</h3>
                        <ul>
                            <li>Contagem de Uso: {courtUsageData.reduce((acc, curr) => acc + curr.usage_count, 0)}</li>
                            <li>Custo Aproximado em Dólares: {courtUsageData.reduce((acc, curr) => acc + curr.approximate_cost, 0).toFixed(2)}</li>
                        </ul>
                    </div>
                    <div className="col-md-4">
                        <h3 className="mt-4">Limites Diários Globais</h3>
                        <ul>
                            <li>Contagem de Uso: {court_usage_count}</li>
                            <li>Custo Aproximado em Dólares: {court_usage_cost?.toFixed(2)}</li>
                        </ul>
                    </div>
                    <div className="col-md-4">
                        <h3 className="mt-4">Limites Diários por Usuário</h3>
                        <ul>
                            <li>Contagem de Uso: {user_usage_count}</li>
                            <li>Custo Aproximado em Dólares: {user_usage_cost?.toFixed(2)}</li>
                        </ul>
                    </div>
                </div>
            </>)}
            {courtUsageData.length === 0 && !userUsageData.length && (
                <p>Não há dados disponíveis para o tribunal e mês selecionados.</p>
            )}

            {/* Tabela de Usuários */}
            {userUsageData.length > 0 && (
                <>
                    <h3 className="mt-4">Detalhamento por Usuário</h3>
                    <table className="table table-striped table-sm table-bordered table-hover">
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th style={{ textAlign: 'right' }}>Contagem de Uso</th>
                                <th style={{ textAlign: 'right' }}>Tokens Input</th>
                                <th style={{ textAlign: 'right' }}>Tokens Output</th>
                                <th style={{ textAlign: 'right' }}>Custo Aprox. (Dólar)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userUsageData.map((user) => (
                                <tr key={user.id} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <ModeLink prefetch={false} href={`/dashboard/${court_id}/${month}?userId=${user.id}`} className="text-decoration-none text-dark">
                                            {displayUserName(user.name, user.username)}
                                        </ModeLink>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <ModeLink prefetch={false} href={`/dashboard/${court_id}/${month}?userId=${user.id}`} className="text-decoration-none text-dark">
                                            {user.usage_count}
                                        </ModeLink>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <ModeLink prefetch={false} href={`/dashboard/${court_id}/${month}?userId=${user.id}`} className="text-decoration-none text-dark">
                                            {user.input_tokens_count.toLocaleString()}
                                        </ModeLink>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <ModeLink prefetch={false} href={`/dashboard/${court_id}/${month}?userId=${user.id}`} className="text-decoration-none text-dark">
                                            {user.output_tokens_count.toLocaleString()}
                                        </ModeLink>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <ModeLink prefetch={false} href={`/dashboard/${court_id}/${month}?userId=${user.id}`} className="text-decoration-none text-dark">
                                            {user.approximate_cost.toFixed(2)}
                                        </ModeLink>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </Container>
    );
};
