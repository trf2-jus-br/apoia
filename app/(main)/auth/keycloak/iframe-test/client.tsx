'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Container } from "react-bootstrap"
import { SourceMessageFromParentType, MessageWithType, AuthPopupMessageType, SinkMessageFromParentType, PromptsMessageFromParentType, PromptsMessageToParentType, SOURCE_PARAM_THAT_INDICATES_TO_RETRIEVE_USING_MESSAGE_TO_PARENT, SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT } from "@/lib/utils/messaging"
import devLog from "@/lib/utils/log"

export const ClientIFrameTest = (props: { baseUrl: string; callbackUrl: string }) => {
    const router = useRouter()

    useEffect(() => {
        const postMsgToIframe = (msg: any) => {
            const iframe = document.getElementById('authFrame') as HTMLIFrameElement | null
            if (iframe?.contentWindow) {
                try {
                    const targetOrigin = new URL(props.baseUrl).origin
                    iframe.contentWindow.postMessage(msg, targetOrigin)
                } catch {
                    iframe.contentWindow.postMessage(msg, '*')
                }
            }
        }

        const handleMessage = (event: MessageEvent) => {
            const data = event.data as MessageWithType

            switch ((data as MessageWithType).type) {
                case 'auth-popup': {
                    devLog('Received auth-popup message from iframe:', data)
                    const url = (data as AuthPopupMessageType).payload.url
                    window.open(url, '_blank')
                    break
                }
                case 'auth-completed': {
                    devLog('Received auth-completed message from iframe:', data)
                    postMsgToIframe(data)
                    // Recarrega a página principal para verificar autenticação
                    router.push(props.callbackUrl)
                    break
                }
                case 'get-source': {
                    devLog('Received get-source message from iframe', data)
                    const htmlContent = `<h1>Quem encontra os <strong>erros</strong> deste texto?</h1><p>O Tomás não é uma criança mal comportada, mas sofre de um desiquilíbrio hormonal que o deixa por vezes obsecado com comida, como se estivesse sempre cheinho de fome..</p>`
                    postMsgToIframe({ type: 'set-source', payload: { htmlContent: htmlContent, selectionInfo: { startOffset: 0, endOffset: 100 } } } satisfies SourceMessageFromParentType)
                    break
                }
                case 'approved': {
                    devLog('Received approved message from iframe:', data)
                    break
                }
                case 'get-sink': {
                    devLog('Received get-sink message from iframe', data)
                    postMsgToIframe({ type: 'set-sink', payload: { kind: 'to-parent', buttonText: 'Enviar para a Minuta' } } satisfies SinkMessageFromParentType)
                    break
                }
                case 'get-prompts': {
                    devLog('Received get-prompts message from iframe:', data)
                    const prompts = (data as PromptsMessageToParentType).payload.prompts
                    prompts.forEach((p: any) => { if (p.slug === 'pedidos' && p.origin) p.is_hidden = false })
                    prompts.forEach((p: any) => { if (p.slug === 'refinamento-de-texto' && p.origin) p.is_hidden = true })
                    postMsgToIframe({ type: 'set-prompts', payload: { prompts } } satisfies PromptsMessageFromParentType)
                    break
                }
            }

        }
        window.addEventListener('message', handleMessage)
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [])

    // const src = `${props.baseUrl}/auth/keycloak-iframe?redirect=/sidekick?prompt=revisao-de-texto%26source=${SOURCE_PARAM_THAT_INDICATES_TO_RETRIEVE_USING_MESSAGE_TO_PARENT}%26sink=${SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT}%26sink-button-text=Enviar+para+o+Eproc`
    // const src = `${props.baseUrl}/auth/keycloak-iframe?redirect=/sidekick?process=50016349520244025113%26prompt=minuta-de-sentenca%26sink=${SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT}%26sink-button-text=Enviar+para+o+Eproc`
    // const src = `${props.baseUrl}/auth/keycloak-iframe?redirect=/sidekick?process=50016349520244025113%26prompt=minuta-de-sentenca%26instance=primeiro-grau`
    // const src = `${props.baseUrl}/auth/keycloak-iframe?redirect=/sidekick?process=50092652820214025103%26prompt=chat%26instance=primeiro-grau`
    // const src = `${props.baseUrl}/auth/keycloak-iframe?redirect=/sidekick?process=50016349520244025114%26instance=primeiro-grau`
    // const src = `${props.baseUrl}/auth/keycloak-iframe?redirect=/sidekick?process=50016349520244025114%26instance=segundo-grau%26action=minuta_editar`
    const src = `${props.baseUrl}/auth/keycloak-iframe?redirect=/sidekick?process=50283654220254025001%26instance=primeiro-grau%26action=processo_selecionar`

    return <Container className="mt-3 text-center">
        <h1>Keycloak Authentication Test Page</h1>
        <iframe id="authFrame" style={{ "width": "500px", "height": "800px", border: "1px solid black" }} src={src} allow="clipboard-write"></iframe>
    </Container>
}