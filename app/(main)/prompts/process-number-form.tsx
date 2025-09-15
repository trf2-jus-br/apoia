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
                <div className="col col-12 col-md-6 mt-5">
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
                </div >
            </div >
        </>
    )
}