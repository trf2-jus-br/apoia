'use client'

import { Button } from "react-bootstrap"

export default function Listen(params) {
    const dadosDoProcesso = params.dadosDoProcesso

    // Remover:
    // - todos os elementos marcados com d-print-none ou h-print, d-listen-none ou h-listen, 
    //   para evitar que sejam incluídos na versão para áudio. 
    // - elementos do tipo <span> e deixar apenas o texto, a menos que o span tenha alguma classe específica que deva ser mantida (isso pode ser ajustado conforme necessário).
    // - classes alert e alert-* de <div>, mas manter a div.
    const sanitizeHtml = (rawHtml: string) => {
        const parser = new DOMParser()
        const doc = parser.parseFromString(rawHtml, 'text/html')

        doc.querySelectorAll('.d-print-none, .h-print, .d-listen-none, .h-listen').forEach(el => el.remove())

        doc.querySelectorAll('span').forEach(span => {
            // if (span.classList.length === 0) {
                const textNode = document.createTextNode(span.textContent || '')
                span.replaceWith(textNode)
            // }
        })

        doc.querySelectorAll('div.alert').forEach(div => {
            div.classList.remove('alert', ...Array.from(div.classList).filter(c => c.startsWith('alert-')))
        })

        return doc.body.innerHTML
    }

    const handleClick = async () => {
        const printDiv = document.querySelector('#printDiv')
        const innerHTML = printDiv ? printDiv.innerHTML : ''
        const body = sanitizeHtml(innerHTML)

        const res = await fetch('/api/plain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: body, title: dadosDoProcesso?.numeroDoProcesso || 'Processo' }),
        })

        if (!res.ok) {
            alert('Erro ao gerar página de texto simples.')
            return
        }

        const { id } = await res.json()
        window.open(`/plain/${id}.html`, '_blank')
    }

    return (
        <div className="h-print" style={{ height: '1em' }}>
            <div className="float-end">
                <Button variant="primary" type="button" onClick={handleClick} accessKey="u"><u>O</u>uvir</Button>
            </div>
        </div>
    )
}

