'use client'

import { signIn } from "next-auth/react"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form } from 'react-bootstrap';
import ErrorMessage from "@/components/error-message";

const CredentialsForm = (params) => {
    const [errorMessage, setErrorMessage] = useState('')
    const [sistema, setSistema] = useState(undefined as string | undefined)
    const [matricula, setMatricula] = useState('');
    const [senha, setSenha] = useState('');
    const [processing, setProcessing] = useState(false);
    const router = useRouter()

    const handleSignInWithCredentials = async (e) => {
        setProcessing(true)
        e.preventDefault();
        const r = await signIn("credentials", {
            email: matricula, password: senha, system: sistema, redirect: false
        })
        if (r && r.ok) {
            router.replace('/')
            router.refresh()
            setProcessing(false)
            return
        }
        setErrorMessage('Erro: credenciais inválidas.')
        setProcessing(false)
    }

    return (<>
        <div className="px-4 py-1 my-1 text-center">
            <div className="col-lg-6 mx-auto">
                {
                    errorMessage
                    ? <p className="alert alert-danger mt-3 mb-4"><ErrorMessage message={errorMessage} /></p>
                    : <></>
                }
                <h4>Login com credenciais do Eproc/PJ-e</h4>
                <form onSubmit={(event) => handleSignInWithCredentials(event)}>
                    <Form.Select aria-label="Selecione o Órgão" value={sistema} onChange={e => setSistema(e.target.value)} className='w-100 mt-2 text-center'>
                        <option value={undefined} hidden>Selecione o Órgão</option>
                        {params.systems.map(system => (<option key={system} value={system}>{system}</option>))}
                    </Form.Select>
                    <Form.Control placeholder='Matricula' className='mt-2 w-100 text-center' type='input' value={matricula} onChange={e => setMatricula(e.target.value)}></Form.Control>
                    <Form.Control placeholder='Senha' className='mt-1 w-100 text-center' type='password' value={senha} onChange={e => setSenha(e.target.value)}></Form.Control>
                    <Button disabled={processing || !sistema || !matricula || !senha} type="submit" variant="primary" className="mt-2 w-100">Entrar</Button>
                </form>
            </div>
        </div>
    </>)
}

export default CredentialsForm