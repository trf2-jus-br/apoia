"use client"

function ErrorMsg(msg: string) {

    if (msg.match(/You exceeded your current quota, please check your plan and billing details/)) {
        return <>
            <span>Você excedeu sua cota atual, por favor verifique seu plano e detalhes de cobrança.</span>
            <p>Dependendo do seu plano e do modelo escolhido, você terá direito a determinado número de solicitações de IA por minuto. Quando esse limite é atingido, esse erro é lançado.</p>
            <p>Atenção, <strong>não utilize o plano gratuito do Gemini API</strong>, pois os dados enviados são utilizados para treinar futuras versões da IA. O plano gratuito não está de acordo a LGPD e a Resolução 615/2025 do CNJ.</p>
            <p>Para mais informações sobre este erro, acesse: https://ai.google.dev/gemini-api/docs/rate-limits</p>
        </>
    }

    if (msg.match(/API key not valid. Please pass a valid API key/)) {
        return <span>A chave da API informada não é válida. Por favor, forneça uma chave de API válida.</span>
    }

    if (msg.match(/Não foram encontrados registros/)) 
        return <>
            <p>A Apoia utiliza o Datalake para obter informações sobre os processos e também o conteúdo das peças processuais.</p>
            <p>A Apoia solicitou os metadados de um processo e o Datalake respondeu com um erro indicando que o processo não foi encontrado.</p>
            <p>Este erro pode ser causado por um problema na fila de processamento do Datalake ou na integração entre o tribunal em questão e o Datalake.</p>
            <p>Sugimos entrar em contato com a equipe que cuida do datalake para resolver esse problema.</p>
            <p>Isso é um erro bem comum, mas não é um erro da Apoia.</p>
        </>

    if (msg.match(/Input is too long for requested model/))
        return <>
            <p>Cada modelo de inteligência artificial tem um limite da quantidade de texto que consegue processar.</p>
            <p>Esse erro significa que o texto que você está tentando processar é muito grande para o modelo que você escolheu.</p>
            <p>Por favor, tente reduzir o tamanho do texto ou escolher um modelo que aceite textos maiores.</p>
        </>

    if (msg.match(/Usuário.*não possui acesso ao processo/))
        return <>
            <p>A Apoia utiliza o Datalake para obter informações sobre os processos e também o conteúdo das peças processuais.</p>
            <p>A Apoia solicitou os metadados de um processo e o Datalake responde com um erro.</p>
            <p>Este erro significa que o processo é <a href="/apoia/faq#nao-e-possivel-acessar-processos-e-pecas-sigilosos">sigiloso</a>.</p>
            <p>Realmente, o Datalake não permite o acesso a processos sigilosos.</p>
            <p>Isso é um erro bem comum, mas não é um erro da Apoia.</p>
        </>

    if (msg.match(/Nível de sigilo.*maior que o máximo permitido/))
        return <p>A Apoia não aceita informações com nível de sigilo maior que o máximo permitido.</p>

    if (msg.match(/O tempo de resposta do serviço Codex excedeu o limite/))
        return <p>A Apoia busca informações sobre os processos e peças processuais no sistema Datalake da PDPJ. Por algum motivo, o Datalake está demorando muito para responder. Por favor, tente novamente mais tarde.</p>

    if (msg.match(/br\.jus\.cnj\.datalake.exception\.RegistroNaoEncontradoException/))
        return <>
            <p>A Apoia utiliza o Datalake para obter informações sobre os processos e também o conteúdo das peças processuais.</p>
            <p>A Apoia solicitou os metadados de um processo e o Datalake responde com um erro.</p>
            <p>Este erro pode ser causado por um problema na fila de processamento do Datalake ou na integração entre o tribunal em questão e o Datalake.  Se o processo for sigiloso, este erro pode estar relacionado à <a href="/apoia/faq#nao-e-possivel-acessar-processos-e-pecas-sigilosos">omissão de processos sigilosos</a>.</p>
            <p>Sugimos entrar em contato com a equipe que cuida do datalake para resolver esse problema.</p>
            <p>Isso é um erro bem comum, mas não é um erro da Apoia.</p>
        </>

    if (msg.match(/Erro interno na API do Codex/))
        return <>
            <p>A Apoia utiliza o Datalake para obter informações sobre os processos e também o conteúdo das peças processuais.</p>
            <p>Aconteceu um erro porque o Datalake disse que um processo tem determinada peça e quando a Apoia solicitou o conteúdo textual dessa peça, o datalake responde com um erro.</p>
            <p>Este erro pode ser causado por um problema na fila de processamento do Datalake ou na integração entre o tribunal em questão e o Datalake.</p>
            <p>Sugimos entrar em contato com a equipe que cuida do datalake para resolver esse problema.</p>
            <p>Isso é um erro bem comum, mas não é um erro da Apoia.</p>
        </>

    if (msg.match(/organization must be verified to stream this model/))
        return <>
            <p>Ocorreu um erro no acesso ao provedor de inteligência artificial OpenAI.</p>
            <p>Este erro acontece normalmente quando se tentar utilizar os modelos gpt-5 ou gpt-5-mini.</p>
            <p >Isso não é um problema da Apoia, mas sim uma exigência da OpenAI. Para acessar os modelos mais novos é necessário fazer a verificação. Isso incluí o envio de foto de documento de identidade e também do reconhecimento facial. Vá para <a href="https://platform.openai.com/settings/organization/general">https://platform.openai.com/settings/organization/general</a> e clique em &quot;Verify Organization&quot; para inicial o processo de verificação.</p>
        </>

    if (msg.match(/model is overloaded/))
        return <>
            <p>Ocorreu um erro no acesso ao provedor de inteligência artificial.</p>
            <p>O modelo está sobrecarregado no momento. Por favor, tente novamente mais tarde.</p>
        </>

    return null
}

export default function ErrorMessage(params: { message: string }) {
    const msg = params.message
    return (<>
        {ErrorMsg(msg)
            ? <>{ErrorMsg(msg)}
                <p className="text-muted mb-0 mt-1" style={{ fontSize: '70%' }}>{msg}</p>
            </>
            : msg}

    </>)
}