'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CourtUsageData {
    date: string;
    usage_count: number;
    approximate_cost: number;
}

interface CourtUsageChartProps {
    data: CourtUsageData[];
}

const formatDateForAxis = (dateStr: string) => {
    const date = new Date(`${dateStr}`)
    return `${date.getDate() + 1}`
}

const CourtUsageChart: React.FC<CourtUsageChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <p>Sem dados para exibir no gráfico.</p>;
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 5, }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDateForAxis} />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip formatter={(value: number, name: string) => name === 'approximate_cost' ? `${value.toFixed(2)}` : value.toString()} />
                <Legend />
                <Bar yAxisId="left" dataKey="usage_count" fill="#8884d8" name="Contagem de Uso" />
                <Bar yAxisId="right" dataKey="approximate_cost" fill="#82ca9d" name="Custo Aprox. (Dólar)" />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default CourtUsageChart;