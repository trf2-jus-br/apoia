'use client'

import { Button } from "react-bootstrap"

export default function Listen(params) {
    const dadosDoProcesso = params.dadosDoProcesso

    // Remover:
    // - todos os elementos marcados com d-print-none ou h-print, d-listen-none ou h-listen, 
    //   para evitar que sejam incluídos na versão para áudio. 
    // - elementos do tipo <span> e deixar apenas o texto, a menos que o span tenha alguma classe específica que deva ser mantida (isso pode ser ajustado conforme necessário).
    // - classes alert e alert-* de <div>, mas manter a div.
    const sanitizeHtml = (html: string) => {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')

        doc.querySelectorAll('.d-print-none, .h-print, .d-listen-none, .h-listen').forEach(el => el.remove())

        doc.querySelectorAll('span').forEach(span => {
            if (span.classList.length === 0) {
                const textNode = document.createTextNode(span.textContent || '')
                span.replaceWith(textNode)
            }
        })

        doc.querySelectorAll('div.alert').forEach(div => {
            div.classList.remove('alert', ...Array.from(div.classList).filter(c => c.startsWith('alert-')))
        })

        return doc.body.innerHTML
    }

    const handleClick = (e) => {
        const printDiv = document.querySelector('#printDiv')
        const innerHTML = printDiv ? printDiv.innerHTML : ''
        const htm = sanitizeHtml(innerHTML)

        const win = window.open('', '_blank')
        if (!win) {
            alert('Não foi possível abrir a nova aba. Verifique se o bloqueador de pop-ups está ativo.')
            return
        }
        win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${dadosDoProcesso?.numeroDoProcesso || 'Processo'}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.8; font-size: 1.1rem; color: #222; }
  h1, h2, h3 { margin-top: 1.5rem; }
  p { margin-bottom: 1rem; }
</style>
</head>
<body>
${htm}
</body>
</html>`)
        win.document.close()
    }

    return (
        <div className="h-print" style={{ height: '1em' }}>
            <div className="float-end">
                <Button variant="primary" type="button" onClick={(e) => handleClick(e)}>Ouvir</Button>
            </div>
        </div>
    )
}