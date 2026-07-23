'use server'

import { getSelectedModelParams } from "@/lib/ai/model-server"
import { assertCurrentUser, getCurrentUser } from "@/lib/user"
import { faBook, faKey } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Link from "next/link"
import ModeLink from "./mode-link"

export default async function ApiKeyMissing({ }: {}) {
    const user = await getCurrentUser()
    if (!user) return null
    const { model, apiKey } = await getSelectedModelParams()
    const apiKeyProvided = !!apiKey
    if (apiKeyProvided) return null

    return <div className="alert alert-info text-center mb-4" role="alert">
        Para usar as ferramentas de IA, você precisa de uma Chave de API.{' '}
        <ModeLink href="/prefs" className="alert-link">Cadastre a sua aqui</ModeLink>.
        <FontAwesomeIcon icon={faKey} className="ms-2" aria-hidden="true" />
        <br />
        Não sabe o que é? Consulte o{' '}
        <Link
            href="https://trf2.gitbook.io/apoia/chave-de-api-e-modelo-de-ia"
            className="alert-link"
        >Manual da Apoia</Link>.
        <FontAwesomeIcon icon={faBook} className="ms-2" aria-hidden="true" />
    </div>
}