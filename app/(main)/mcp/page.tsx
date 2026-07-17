import { Container } from 'react-bootstrap'
import { assertCurrentUser } from '@/lib/user'
import { getApoiaToolsMetadata } from '@/lib/mcp/mcp-registry'
import McpPage from './McpPage'

export default async function McpInfoPage() {
    await assertCurrentUser()
    const toolsList = getApoiaToolsMetadata()
    return (
        <Container fluid={false} className="">
            <McpPage toolsList={toolsList} />
        </Container>
    )
}
