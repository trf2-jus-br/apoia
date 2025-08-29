'use client';

import React, { useState, FormEvent } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { Button, Form } from 'react-bootstrap';
import { useRouter } from 'next/navigation';

export default function ProcessNumberForm() {
    const router = useRouter();
    noStore()
    const [number, setNumber] = React.useState('')
    const [processing, setProcessing] = React.useState(false)
    const [errorMessage, setErrorMessage] = React.useState('')


    const handleClick = (e) => {
        setProcessing(true);
        e.preventDefault();
        router.push(`/process/${number}`);
        // setProcessing(false);
    }

    return (
        <>
            <div className="row justify-content-center">
                <div className="col-12">
                    <h4 className="text-center mt-5 mb-2">Síntese do Processo </h4>
                </div>
                <div className="col col-12 col-md-6">
                    <form>
                        <div className=" d-block mx-auto pt-5 pb-5 mb-3 alert-secondary alert">
                            <div >
                                <div className="row">
                                    <div className="col">
                                        <div className="form-group">
                                            <label>Número do Processo</label>
                                            <input type="text" id="numeroDoProcesso" name="numeroDoProcesso" placeholder="" autoFocus={true} className="form-control" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumber(e.target.value.replace(/\D/g, ""))} value={number} />
                                        </div>
                                    </div>
                                </div>
                                <div className="row pt-3">
                                    <div className="col">
                                        <button onClick={handleClick} disabled={processing || number.length != 20} className="btn btn-primary float-end" style={{ width: '10em' }}>{processing
                                            ? (<span className="spinner-border text-white opacity-50" style={{ width: '1em', height: '1em' }} role="status"><span className="visually-hidden">Loading...</span></span>)
                                            : 'Consultar'}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}