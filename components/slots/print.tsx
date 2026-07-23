'use client'

import { use, useEffect, useRef, useState } from "react"
import { Button, Form } from "react-bootstrap"


export default function Print(params) {
    const [html, setHtml] = useState('')
    const ref = useRef(null)

    const handleClick = (e) => {
        const printDiv = document.querySelector('#printDiv')
        const innerHTML = printDiv ? printDiv.innerHTML : ''
        const printHtml = document.querySelector('#printHtml')
        if (printHtml) {
            printHtml.setAttribute('value', innerHTML)
        }
        let htm = innerHTML
        setHtml(htm)
    }

    useEffect(() => {
        if (!html) return
        const printForm = document.querySelector('#printForm') as HTMLFormElement
        if (printForm) {
            printForm.submit()
        }
        setHtml('')
    }, [html])

    return (
        <div className="h-print" style={{ height: '1em' }}>
            <Form id="printForm" className="float-end" action={`/api/pdf/${params.numeroDoProcesso || 'pagina'}`} method="post" ref={ref} target="_blank" >
                <input id="printHtml" type="hidden" name="html" value={html} />
                <Button variant="primary" type="button" onClick={(e) => handleClick(e)} aria-label="Gerar PDF da página" accessKey="d">PDF</Button>
            </Form>
        </div>
    )
}