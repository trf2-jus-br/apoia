import { unstable_noStore as noStore } from 'next/cache'
import { Suspense } from 'react'
import { assertCurrentUser } from '@/lib/user'
// import { ListaDeProdutos } from './lista-produtos'
import { ProdutoLoading } from '@/components/loading'
import { obterDadosDoProcesso } from '@/lib/proc/process'
import PrintServerContents from './print-server-contents'
import ErrorMsg from './error-msg'
import { SubtituloAsync, SubtituloLoading } from '@/components/slots/subtitulo'
import ChoosePieces from './choose-pieces'
import { ListaDeProdutosServer } from './lista-produtos-server'
import { DadosDoProcessoType, StatusDeLancamento } from '@/lib/proc/process-types'
import { cookies } from 'next/headers'
import { buildFooterFromPieces } from '@/lib/utils/footer'
import ProcessFooter from './process-client-footer'
import { simpleHashCode } from '@/lib/utils/utils'

export const maxDuration = 60 // seconds

const canonicalPieces = (pieces: string[]) => pieces.sort((a, b) => a.localeCompare(b)).join(',')

export async function ChoosePiecesServer({ pDadosDoProcesso, statusDeSintese, ready }: { pDadosDoProcesso: Promise<DadosDoProcessoType>, statusDeSintese: StatusDeLancamento, ready?: boolean }) {
    const dadosDoProcesso = await pDadosDoProcesso
    // console.log('dadosDoProcesso', dadosDoProcesso)
    if (!dadosDoProcesso || dadosDoProcesso.errorMsg)
        return ''

    return <ChoosePieces dadosDoProcesso={dadosDoProcesso} key={simpleHashCode(JSON.stringify(dadosDoProcesso))} statusDeSintese={statusDeSintese} ready={ready} />
}

export default async function ProcessServerContents({ id, kind, pieces, ready }: { id: string, kind?: string, pieces?: string, ready?: boolean }) {
    noStore()

    const pUser = assertCurrentUser()

    id = (id?.toString() || '').replace(/[^0-9]/g, '')

    const statusCookie = (await cookies()).get('beta-tester')?.value

    const statusDeSintese = statusCookie ? JSON.parse(statusCookie) : StatusDeLancamento.PUBLICO

    const pDadosDoProcesso = obterDadosDoProcesso({ numeroDoProcesso: id, pUser, kind, pieces: pieces ? pieces.split(',') : undefined, statusDeSintese })

    return (
        <div className="mb-3">
            <div className="">
                <Suspense fallback={SubtituloLoading()}>
                    <SubtituloAsync pDadosDoProcesso={pDadosDoProcesso} />
                </Suspense>
                <Suspense fallback=''>
                    <ChoosePiecesServer pDadosDoProcesso={pDadosDoProcesso} statusDeSintese={statusDeSintese} ready={ready} />
                </Suspense>
                <Suspense fallback=''>
                    <ErrorMsg pDadosDoProcesso={pDadosDoProcesso} />
                </Suspense>
                {ready && (<>
                    <div className="mb-4"></div>
                    <Suspense fallback={<>{ProdutoLoading()}{ProdutoLoading()}{ProdutoLoading()}</>}>
                        <ListaDeProdutosServer pDadosDoProcesso={pDadosDoProcesso} kind={kind} pieces={pieces} />
                    </Suspense>
                    <Suspense fallback=''>
                        <PrintServerContents pDadosDoProcesso={pDadosDoProcesso} numeroDoProcesso={id} />
                    </Suspense>
                    <hr className="mt-5" />
                    <p style={{ textAlign: 'center' }}>Este documento foi gerado pela Apoia, ferramenta de inteligência artificial desenvolvida exclusivamente para facilitar a triagem de acervo, e não substitui a elaboração de relatório específico em cada processo, a partir da consulta manual aos eventos dos autos. Textos gerados por inteligência artificial podem conter informações imprecisas ou incorretas.</p>
                    <ProcessFooter prompt={kind} pDadosDoProcesso={pDadosDoProcesso} />
                </>)}
            </div>
        </div>
    )
}