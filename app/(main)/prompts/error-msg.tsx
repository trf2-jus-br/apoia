import ErrorMessage from "@/components/error-message"
import { getPiecesWithContent, waitForTexts } from "@/lib/ai/prompt"
import { DadosDoProcessoType } from "@/lib/proc/process-types"

const ErrorMsg =  ({ dadosDoProcesso }: { dadosDoProcesso: DadosDoProcessoType }) => {
    if (!dadosDoProcesso)
        return (<div className="alert alert-danger mt-4">Não foi possível obter os dados do processo.</div>)

    if (dadosDoProcesso?.errorMsg)
        return (<div className="alert alert-danger mt-4"><ErrorMessage message={dadosDoProcesso.errorMsg} /></div>)

    // const pecasComConteudo = await getPiecesWithContent(dadosDoProcesso, dadosDoProcesso.numeroDoProcesso)
    // try {
    //     await waitForTexts({ textos: pecasComConteudo })
    // } catch (error) {
    //     return (<div className="alert alert-danger mt-4">{error.message}</div>)
    // }    

    return ''
}

export default ErrorMsg
