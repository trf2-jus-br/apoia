'use client'

import React from 'react'
import { faStar } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { RatingTooltip } from './RatingTooltip'

interface RatingStatsDisplayProps {
    voterCount: number
    avgLaplace: number
    wilsonScore: number
    userRating?: number | null
    showDetails?: boolean
    onClick?: () => void
    promptBaseId: number
}

// Número mínimo de votos para exibir a média
export const MIN_VOTES_TO_SHOW_RATING = 1

// Função para formatar números com vírgula (padrão brasileiro)
const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals).replace('.', ',')
}

export const RatingStatsDisplay: React.FC<RatingStatsDisplayProps> = ({
    voterCount,
    avgLaplace,
    wilsonScore,
    userRating = null,
    showDetails = false,
    onClick,
    promptBaseId
}) => {
    const hasEnoughVotes = voterCount >= MIN_VOTES_TO_SHOW_RATING

    const content = !hasEnoughVotes ? (
        // Menos de MIN_VOTES_TO_SHOW_RATING votos: mostra apenas a estrela em cinza claro
        <button
            type="button"
            className="btn btn-link p-0"
            onClick={onClick}
            style={{ alignItems: 'center' }}
            aria-label="Avaliar prompt"
        >
            <FontAwesomeIcon icon={faStar} style={{ color: '#e0e0e0' }} />
        </button>
    ) : (
        // MIN_VOTES_TO_SHOW_RATING ou mais votos: mostra o número em azul e sublinhado
        <button
            type="button"
            className="btn btn-link p-0"
            onClick={onClick}
            style={{
                color: '#0d6efd',
                textDecoration: 'underline'
            }}
            aria-label={`Avaliar prompt. Média ${formatNumber(avgLaplace)} de 5 estrelas`}
        >
            {formatNumber(avgLaplace)}
        </button>
    )

    return (
        <RatingTooltip
            avgLaplace={avgLaplace}
            voterCount={voterCount}
            userRating={userRating}
            showDetails={showDetails}
            minVotes={MIN_VOTES_TO_SHOW_RATING}
            promptBaseId={promptBaseId}
        >
            {content}
        </RatingTooltip>
    )
}
