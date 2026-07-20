"use client"

import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { TicketFormModal } from './ticket-form';

function ErrorMsg(msg: string) {
    if (msg.match(/Não é possível armazenar um resultado de IA vazio/)) {
        return <>
            <p>Ocorreu um erro ao processar a solicitação de IA porque o resultado retornado pela API de IA está vazio.</p>
            <p>Isso pode acontecer por diversos motivos, o prompt pode estar incorreto, os dados do processo podem estar incompletos ou incorretos, ou podem haver problemas temporários na API de IA.</p>
            <p>Sugiro tentar novamente mais tarde. Se o problema persistir, tente outro prompt.</p>
        </>
    }

    if (msg.match(/Tipo de conteúdo não suportado: application\/octet-stream/)) {
        return <>
            <p>A Apoia acessar o conteúdo de uma peça processual que está em um formato não suportado.</p>
            <p>Esse erro normalmente acontece quando a peça processual está em um formato diferente de PDF, como por exemplo um arquivo de imagem (JPG, PNG, etc) ou um arquivo compactado (ZIP, RAR, etc).</p>
            <p>Por favor, verifique o conteúdo da peça processual no sistema do tribunal para confirmar o formato do arquivo.</p>
        </>
    }

    if (msg.match(/Your credit balance is too low/)) {
        return <>
            <p>Seu saldo de créditos está muito baixo.</p>
            <p>Por favor, adicione mais créditos para continuar utilizando o serviço normalmente.</p>
        </>
    }

    if (msg.match(/The input token count exceeds the maximum number of tokens allowed/) || msg.match(/prompt is too long/)) {
        return <>
            <p>Cada modelo de inteligência artificial tem um limite da quantidade de texto que consegue processar.</p>
            <p>Esse erro significa que o texto que você está tentando processar é muito grande para o modelo que você escolheu.</p>
            <p>Por favor, tente reduzir o tamanho do texto ou escolher um modelo que aceite textos maiores.</p>
        </>
    }

    if (msg.match(/O tempo de resposta do serviço Codex excedeu o limite/)) {
        return <>
            <p>A Apoia utiliza o Datalake para obter informações sobre os processos e também o conteúdo das peças processuais.</p>
            <p>A Apoia fez uma solicitação ao Datalake que respondeu com um erro indicando que está sobrecarregado.</p>
            <p>Sugimos entrar em contato com a equipe que cuida do datalake para resolver esse problema.</p>
            <p>Isso é um erro bem comum, mas não é um erro da Apoia.</p>
        </>
    }

    if (msg.match(/You exceeded your current quota, please check your plan and billing details/) || msg.match(/exceed the rate limit/)) {
        return <>
            <p>Você atingiu o limite de uso do seu plano atual. Por favor, verifique os detalhes do seu plano e a cota disponível para continuar utilizando o serviço normalmente.</p>
            <p>Dependendo do tipo de plano e do modelo selecionado, há um número máximo de solicitações por minuto. Quando esse limite é atingido, o sistema pausa temporariamente o processamento.</p>
            <p>Importante: evite utilizar o plano gratuito do Gemini API, pois ele armazena e utiliza os dados enviados para treinar versões futuras da IA. Esse uso não está em conformidade com a LGPD nem com a Resolução CNJ nº 615/2025.</p>
        </>
    }

    if (msg.match(/API key not valid. Please pass a valid API key/) || msg.match(/Incorrect API key provided/)) {
        return <span>A chave da API informada não é válida. Por favor, forneça uma chave de API válida.</span>
    }

    if (msg.match(/Não foram encontrados registros/) || msg.match(/ConsultaProcessoException - The specified key does not exist/))
        return <>
            <p>A Apoia utiliza o Datalake para obter informações sobre os processos e também o conteúdo das peças processuais.</p>
            <p>A Apoia solicitou os metadados de um processo e o Datalake respondeu com um erro indicando que o processo não foi encontrado.</p>
            <p>Este erro pode ser causado por um problema na fila de processamento do Datalake ou na integração entre o tribunal em questão e o Datalake. Também pode se tratar de um processo anterior a 2020 que não foi migrado para o Datalake.</p>
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
    const [showTicketForm, setShowTicketForm] = useState(false);

    const msg = params.message
    return (<>
        {ErrorMsg(msg)
            ? <>{ErrorMsg(msg)}
                <p className="text-muted mb-0 mt-1" style={{ fontSize: '70%' }}>{msg}</p>
            </>
            : <>
                <p className="mb-0">{msg}</p>
            </>}
        {/* <p className="text-muted mb-0 mt-1" style={{ fontSize: '70%', textAlign: 'right' }}>Se precisar de suporte, clique <a href="#" onClick={() => setShowTicketForm(true)}>aqui</a> para abrir um chamado.</p> */}
        <TicketFormModal
            show={showTicketForm}
            onHide={() => setShowTicketForm(false)}
            kind="ERRO"
            errorContext={msg}
        />
    </>)
}