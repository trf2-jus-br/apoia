import ProcessNumberForm from '@/components/process-number-form'
import { Container } from 'react-bootstrap'

import { assertCurrentUser } from '@/lib/user'
import { assertModel } from '@/lib/ai/model-server'

// export const runtime = 'edge'
export const preferredRegion = 'home'


export default async function Home() {
  await assertCurrentUser()
  await assertModel()

  return (<>
    <Container fluid={false}>
      <ProcessNumberForm />

      <div className="row justify-content-center">
        <div className="col col-12 col-md-6 mt-5">
          <p><strong>Apoia</strong> utiliza inteligência artificial para gerar resumos de peças processuais e realizar análises detalhadas dos processos, auxiliando magistrados e servidores na tomada de decisões. Com esta ferramenta, é possível otimizar o tempo e aumentar a eficiência no manejo dos casos, permitindo uma visão rápida e precisa das informações mais relevantes.</p>

          <p>É importante destacar, no entanto, que as IAs podem apresentar <a href="https://pt.wikipedia.org/wiki/Alucina%C3%A7%C3%A3o_(intelig%C3%AAncia_artificial)" target="_blanK">alucinações ou erros factuais</a>. Portanto, é essencial que todos os resumos e análises gerados pelo sistema sejam cuidadosamente revisados e validados pelos profissionais antes de serem utilizados em qualquer decisão ou documento oficial.</p>
        </div>
      </div>

    </Container>
  </>)
}