'use client';

import ModeLink from '@/components/mode-link';
import Link from 'next/link';
import React from 'react';

interface PeriodNavigationProps {
    court_id: number;
    currentPeriod: string; // YYYY-MM or YYYY-MM-DD
    userId?: string;
}

export default function PeriodNavigation({ court_id, currentPeriod, userId }: PeriodNavigationProps) {
    const parsePeriod = (period: string) => {
        const parts = period.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parts[2] ? parseInt(parts[2]) : 1;
        return { year, month, day };
    };

    const formatPeriod = (year: number, month: number, day: number) => {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const getPreviousPeriod = () => {
        const { year, month, day } = parsePeriod(currentPeriod);
        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth < 1) {
            prevMonth = 12;
            prevYear -= 1;
        }
        return formatPeriod(prevYear, prevMonth, day);
    };

    const getNextPeriod = () => {
        const { year, month, day } = parsePeriod(currentPeriod);
        let nextMonth = month + 1;
        let nextYear = year;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }
        return formatPeriod(nextYear, nextMonth, day);
    };

    const baseUrl = `/dashboard/${court_id}`;

    const previousUrl = userId 
        ? `${baseUrl}/${getPreviousPeriod()}?userId=${userId}`
        : `${baseUrl}/${getPreviousPeriod()}`;
    
    const nextUrl = userId 
        ? `${baseUrl}/${getNextPeriod()}?userId=${userId}`
        : `${baseUrl}/${getNextPeriod()}`;

    return (
        <div className="d-flex justify-content-between align-items-center mb-4">
            <ModeLink prefetch={false} href={previousUrl} className="btn btn-outline-primary">
                ← Período Anterior
            </ModeLink>
            <span className="fw-bold">{currentPeriod}</span>
            <ModeLink prefetch={false} href={nextUrl} className="btn btn-outline-primary">
                Período Seguinte →
            </ModeLink>
        </div>
    );
}
