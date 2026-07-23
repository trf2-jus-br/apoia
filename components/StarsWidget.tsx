'use client'

import React, { useState, useCallback } from 'react'
import { faStar } from '@fortawesome/free-regular-svg-icons'
import { faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface StarsWidgetProps {
    promptBaseId: number
    initialRating?: number | null
    isOpen?: boolean
    onRatingChange?: (stats: RatingStats) => void
    onClose?: () => void
}

interface RatingStats {
    voter_count: number
    avg_laplace: number
    wilson_score: number
}

export const StarsWidget: React.FC<StarsWidgetProps> = ({
    promptBaseId,
    initialRating,
    isOpen: controlledOpen,
    onRatingChange
}) => {
    const [internalOpen, setInternalOpen] = useState(false)
    const [fading, setFading] = useState(false)
    const [removed, setRemoved] = useState(false)
    const [currentRating, setCurrentRating] = useState<number | null>(initialRating || null)
    const [hoverRating, setHoverRating] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const [ratingLoaded, setRatingLoaded] = useState(false)

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen

    // Carrega o rating atual do usuário
    const loadRatingIfNeeded = useCallback(async () => {
        if (ratingLoaded || loading) return

        setLoading(true)
        try {
            const response = await fetch(`/api/v1/prompt/${promptBaseId}/rating`)
            if (response.ok) {
                const data = await response.json()
                if (data.userRating) {
                    setCurrentRating(data.userRating.stars)
                }
                setRatingLoaded(true)
            }
        } catch (error) {
            console.error('Error loading rating:', error)
        } finally {
            setLoading(false)
        }
    }, [promptBaseId, ratingLoaded, loading])

    // Abre o widget quando controlado externamente
    React.useEffect(() => {
        if (open && !ratingLoaded) {
            loadRatingIfNeeded()
        }
    }, [open, ratingLoaded, loadRatingIfNeeded])

    const handleSelect = useCallback(async (stars: number, e: React.MouseEvent) => {
        e.stopPropagation()

        if (loading) return

        setLoading(true)
        setFading(true)

        try {
            const response = await fetch(`/api/v1/prompt/${promptBaseId}/rating`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stars })
            })

            if (response.ok) {
                const data = await response.json()
                setCurrentRating(stars)
                if (onRatingChange && data.stats) {
                    onRatingChange(data.stats)
                }
            } else {
                console.error('Error saving rating:', await response.text())
            }
        } catch (error) {
            console.error('Error saving rating:', error)
        } finally {
            setLoading(false)
            // wait for fade animation to finish then remove
            setTimeout(() => setRemoved(true), 350)
        }
    }, [promptBaseId, onRatingChange, loading])

    if (removed) return null

    const displayRating = hoverRating || currentRating

    // Se não está aberto, não mostra nada (será controlado pelo RatingStatsDisplay)
    if (!open) return null

    return (
        <span
            onMouseLeave={() => {
                if (controlledOpen === undefined) {
                    setInternalOpen(false)
                }
                setHoverRating(null)
            }}
            onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
            }}
            style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                padding: '4px'
            }}
        >
            {/* container to animate fade when a star is clicked */}
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: fading ? 0 : 1,
                    transition: 'opacity .35s ease',
                    gap: 4
                }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Show 5-star picker */}
                <span
                    style={{ display: 'inline-flex', gap: 4 }}
                    onMouseLeave={() => setHoverRating(null)}
                >
                    {Array.from({ length: 5 }).map((_, i) => {
                        const n = i + 1
                        const isFilled = displayRating ? n <= displayRating : false

                        return (
                            <button
                                type="button"
                                key={n}
                                className="btn btn-link p-0 prompt-star"
                                aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                                onClick={(e: React.MouseEvent) => handleSelect(n, e)}
                                onMouseEnter={() => setHoverRating(n)}
                                disabled={loading}
                                style={{
                                    cursor: loading ? 'wait' : 'pointer',
                                    color: isFilled ? '#ffc107' : '#cfcfcf',
                                    transition: 'transform .12s ease, color .12s ease',
                                    fontSize: '1.1em'
                                }}
                            >
                                <FontAwesomeIcon icon={isFilled ? faStarSolid : faStar} />
                            </button>
                        )
                    })}
                </span>
            </span>
        </span>
    )
}