import { getPiecesWithContent, waitForTexts } from "@/lib/ai/prompt"

const ErrorMsg = async ({ pDadosDoProcesso }) => {
    const dadosDoProcesso = await pDadosDoProcesso

    if (!dadosDoProcesso)
        return (<div className="alert alert-danger mt-4">Não foi possível obter os dados do processo.</div>)

    if (dadosDoProcesso?.errorMsg)
        return (<div className="alert alert-danger mt-4">{dadosDoProcesso.errorMsg}</div>)

    const pecasComConteudo = await getPiecesWithContent(dadosDoProcesso, dadosDoProcesso.numeroDoProcesso)
    try {
        await waitForTexts({ textos: pecasComConteudo })
    } catch (error) {
        return (<div className="alert alert-danger mt-4">{error.message}</div>)
    }    

    return ''
}

export default ErrorMsg
