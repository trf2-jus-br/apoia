import { Card, CardBody } from 'react-bootstrap'
import { getGlobalStatsCached } from '@/lib/stats-cache'
import { HomeGlobalStatsView } from './home-global-stats-view'

export async function HomeGlobalStats() {
    let stats = null
    try {
        stats = await getGlobalStatsCached()
    } catch (error) {
        console.error('Error fetching global stats for home page:', error)
        return null // Silently fail and render nothing if stats cannot be loaded
    }

    if (!stats) return null

    return (
        <Card className="mb-5 shadow-sm border bg-white rounded-4 d-none d-md-block">
            <CardBody className="py-2 px-3">
                <HomeGlobalStatsView stats={stats} />
            </CardBody>
        </Card>
    )
}

