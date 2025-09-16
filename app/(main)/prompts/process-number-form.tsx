'use client';

import { useEffect, useState } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { Button } from 'react-bootstrap';
import { useRouter } from 'next/navigation';

export default function ProcessNumberForm({ id, onChange }: { id: string, onChange: (number: string) => void }) {
    const router = useRouter();
    noStore()
    const [number, setNumber] = useState('')
    const [processing, setProcessing] = useState(false)

    // useEffect(() => {
    //     if (number?.length == 20)
    //         onChange(number)
    // }, [number, onChange])

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        if (number?.length == 20)
            onChange(number)
    }

    return (
        <>
            <div className="row justify-content-center">
                {/* <h1 className="text-center">Selecione o Processo</h1> */}
                <div className="col col-12 col-md-6 mt-4">
                    <div className="mx-auto pt-4 pb-4 mb-5 alert-secondary alert">
                        <form>
                            <div className="form-group">
                                <label>Número do Processo</label>
                                <input type="text" id="numeroDoProcesso" name="numeroDoProcesso" placeholder="" autoFocus={true} className="form-control" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumber(e.target.value.replace(/\D/g, ""))} value={number} />
                            </div>
                            <div className="d-flex justify-content-end mt-4">
                                <Button onClick={handleClick} disabled={processing || number.length != 20} className="btn btn-primary" style={{ width: '10em' }}>
                                    {processing ? (
                                        <span className="spinner-border text-white opacity-50" style={{ width: '1em', height: '1em' }} role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </span>
                                    ) : 'Prosseguir'}
                                </Button>
                            </div>
                        </form >
                    </div>
                    <p><strong>Apoia</strong> utiliza inteligência artificial para gerar resumos de peças processuais e realizar análises detalhadas dos processos, auxiliando magistrados e servidores na tomada de decisões. Com esta ferramenta, é possível otimizar o tempo e aumentar a eficiência no manejo dos casos, permitindo uma visão rápida e precisa das informações mais relevantes.</p>

                    <p>É importante destacar, no entanto, que as IAs podem apresentar <a href="https://pt.wikipedia.org/wiki/Alucina%C3%A7%C3%A3o_(intelig%C3%AAncia_artificial)" target="_blanK">alucinações ou erros factuais</a>. Portanto, é essencial que todos os resumos e análises gerados pelo sistema sejam cuidadosamente revisados e validados pelos profissionais antes de serem utilizados em qualquer decisão ou documento oficial.</p>
                </div >
            </div >
        </>
    )
}