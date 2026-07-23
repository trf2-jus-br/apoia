'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Array de cores, incluindo uma cor neutra (cinza) para o "Outros" caso venha na 6ª posição
const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#858c94']

interface ChartProps {
    data: { name: string; executions: number; fullName: string }[]
}

export function MiniCourtChart({ data }: ChartProps) {
    const total = data.reduce((acc, d) => acc + (d.executions || 0), 0)
    const ariaLabel = `Gráfico de ranking de tribunais por volume de processos. Total: ${total.toLocaleString('pt-BR')}.`
    return (
        <div style={{ height: '80px', width: '100%' }} role="img" aria-label={ariaLabel}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                    <XAxis 
                        dataKey="name" 
                        axisLine={{ stroke: '#dee2e6', strokeWidth: 2 }} 
                        tickLine={false} 
                        tick={false} 
                        height={2}
                    />
                    <YAxis hide />
                    <Tooltip 
                        cursor={{ fill: 'transparent' }} 
                        contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }} 
                        formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Processos']}
                        labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                                return payload[0].payload.fullName
                            }
                            return label
                        }}
                    />
                    <Bar 
                        dataKey="executions" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={30}
                        label={{ 
                            position: 'top', 
                            dataKey: 'name', 
                            fill: '#6c757d', 
                            fontSize: 11 
                        }}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}


