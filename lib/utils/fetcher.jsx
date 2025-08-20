import { redirect } from 'next/navigation'
import { getCurrentUser } from '../user'
import { envString } from './env'


const fetcherUtil = {
    fetcher: (...args) => fetch(...args).then(res => res.json()),

    authorization: async () => {
        const user = await getCurrentUser()
        const auth = {
            'Authorization': `${envString('XRP_API_AUTHORIZATION').replace(".", "|")}|${user?.picture?.email}|${user?.picture?.name}|${user?.picture?.cpf}`
        }
        return auth
    },

    async get(url, params, options) {
        let errorMsg = undefined
        let status = 0
        let headers = {
            'Access-Control-Allow-Origin': '*',
        }
        if (params && params.headers)
            headers = { ...headers, ...params.headers }
        if (url.includes(envString('XRP_API_URL')))
            headers = { ...await this.authorization(), ...headers }
        try {
            const res = await fetch(`${url}`, {
                method: 'get',
                headers,
                cache: 'no-store'
            });

            if (res.headers.get('content-type') && res.headers.get('content-type').includes('application/json')) {
                const data = await res.json()
                status = res.status
                if (res.status !== 200) {
                    if (data && data.errormsg) errorMsg = data.errormsg
                    else if (data && data.error && data.error.err && typeof data.error.err === 'object' && data.error.err !== null && data.error.err.message) errorMsg = data.error.err.message
                    else if (data && data.error && data.error.err && typeof data.error.err === 'string' && data.error.err) errorMsg = data.error.err
                    else if (data && data.error && data.error.message) errorMsg = data.error.message
                    else errorMsg = "Indisponibilidade de sistema."
                }
                return data
            } else {
                return await res.blob()
            }
        } catch (ex) {
            errorMsg = `Ocorreu uma indisponibilidade: ${ex}: ${url}`
        }
        finally {
            if ((!options || options.redirect !== false) && status === 401)
                redirect('/auth/signin')
            if (errorMsg) {
                if (params && params.setErrorMessage) params.setErrorMessage(errorMsg)
                throw errorMsg
            }
        }
    },


    async post(url, body, params, options) {
        let errorMsg = undefined
        let status = 0
        let headers = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
        }
        if (params && params.headers)
            headers = { ...headers, ...params.headers }
        if (url.includes(envString('XRP_API_URL')))
            headers = { ...await this.authorization(), ...headers }
        try {
            const res = await fetch(`${url}`, {
                method: 'post',
                body: JSON.stringify(body),
                headers,
                cache: 'no-store'
            });

            const data = await res.json()
            status = res.status
            if (res.status !== 200) {
                if (data && data.errormsg) errorMsg = data.errormsg
                else if (data && data.error && data.error.err && typeof data.error.err === 'object' && data.error.err !== null && data.error.err.message) errorMsg = data.error.err.message
                else if (data && data.error && data.error.err && typeof data.error.err === 'string' && data.error.err) errorMsg = data.error.err
                else if (data && data.error && data.error.message) errorMsg = data.error.message
                else errorMsg = "Indisponibilidade de sistema."
            }
            return data
        } catch (ex) {
            console.log(ex)
            errorMsg = `Ocorreu uma indisponibilidade: ${ex}: ${url}`
        }
        finally {
            if ((!options || options.redirect !== false) && status === 401)
                redirect('/auth/signin')
            if (errorMsg) {
                console.log(errorMsg)
                if (params && params.setErrorMessage) params.setErrorMessage(errorMsg)
                throw new Error(errorMsg)
            }
        }
    },

    processError(error, setErrorMessage) {
        if (error && error.message && error.message === "NEXT_REDIRECT") throw error
        const message = (error && error.message) || error || 'Erro desconhecido'
        if (setErrorMessage) setErrorMessage(message)
        return message
    }

}

export default fetcherUtil