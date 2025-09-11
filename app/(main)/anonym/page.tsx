import { Container } from 'react-bootstrap'
import AnonymPage from './AnonymPage'
import { assertModel } from '@/lib/ai/model-server'

export default async function Anonym() {
  await assertModel()
  return (
    <Container fluid={false}>
      <AnonymPage />
    </Container>
  )
}
