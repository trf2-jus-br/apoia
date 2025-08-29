import React from 'react';
import CourtUsageChart from './CourtUsageChart'; // Import the new client component
import { Container } from 'react-bootstrap';
import { Dao } from '@/lib/db/mysql';
import { CourtUsageData, UserUsageData } from '@/lib/db/mysql-types';
import { dailyLimits } from '@/lib/utils/limits';
import { obfuscateString } from '@/lib/utils/utils';

export default async function DashboardPage(props) {
    const params = await props.params;
    const court_id: number = Number(params?.court?.toString())
    const month: string = params?.month?.toString()
    const { user_usage_count, user_usage_cost, court_usage_count, court_usage_cost } = dailyLimits(court_id)

    // Validate month format 'YYYY-MM(-DD)?'
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(month))
        throw new Error(`Data inicial inválida, esperava AAAA-MM ou AAAA-MM_DD, recebi ${month}.`);
    let [year, monthNumber, day] = month.split('-').map(Number)
    if (day === undefined) day = 1; // Default to the first day of the month if not provided
    const startDate = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let nextMonthYear = year;
    let nextMonthNumber = monthNumber + 1;
    if (nextMonthNumber > 12) {
        nextMonthNumber = 1;
        nextMonthYear += 1;
    }
    const endDate = `${nextMonthYear}-${String(nextMonthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const courtUsageData: CourtUsageData[] = await Dao.retrieveCourtMonthlyUsage(court_id, startDate, endDate)
    const userUsageData: UserUsageData[] = await Dao.retrieveUserMonthlyUsageByCourt(court_id, startDate, endDate)

    return (
        <Container className='mt-5'>
            <h1 className='mb-5 text-centerd'>Dados de Uso do Tribunal {court_id} em {month}</h1>

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
                    <table className="table table-striped table-sm table-bordered">
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th style={{ textAlign: 'right' }}>Contagem de Uso</th>
                                <th style={{ textAlign: 'right' }}>Custo Aprox. (Dólar)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userUsageData.map((user) => (
                                <tr key={user.id}>
                                    <td>{obfuscateString(user.username)}</td>
                                    <td style={{ textAlign: 'right' }}>{user.usage_count}</td>
                                    <td style={{ textAlign: 'right' }}>{user.approximate_cost.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </Container>
    );
};
