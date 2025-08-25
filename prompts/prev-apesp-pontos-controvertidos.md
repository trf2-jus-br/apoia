# PROMPT

## OBJETIVO: Extrair informações da petição inicial (entre os marcadores <peticao-inicial> e </peticao-inicial>) e da contestação (entre os marcadores <contestacao> e </contestacao>) para gerar um relatório estruturado de pontos controvertidos. Se houver algum conteúdo entre os marcadores <replica> e </replica>, inclua-o na análise, considerando que se trata de uma ou mais manifestações adicionais do autor ou do réu.

## INSTRUÇÕES GERAIS:
1) Use exclusivamente o conteúdo entre os marcadores <peticao-inicial> ... </peticao-inicial> e, caso existam, <contestacao> ... </contestacao> e <replica> ... </replica>. Não infira dados ausentes, não utilizar fontes externas; não completar lacunas com conhecimentos gerais.
2) Datas: normalize para dd/mm/aaaa. Se vier “mm/aaaa”, considere o dia 01. Se vier mês por extenso, converta. Se a data inicial > final, marque como (intervalo inconsistente) no Resumo.
3) Limites de resumo: Parte I ≤ 70 palavras; Partes II e III ≤ 50 palavras cada.
4) Linguagem: objetiva, técnica e impessoal.
5) Saída padronizada: todos os blocos devem vir entre marcadores próprios para facilitar parsing.

## PARTE I – EXTRAÇÃO DOS PERÍODOS DA PETIÇÃO INICIAL 

# FORMATAÇÃO DA RESPOSTA NA PARTE 1: A RESPOSTA gerada na PARTE I deve ser estruturada por pontos controvertidos, utilizando os marcadores: <PC id=“01”> ... < PC id=“02”> ... < PC id=“03”>... etc. Cada bloco (ponto controvertido) deve possuir o seguinte formato:

<[PC id=“nn”]>
Período: [dd/mm/aaaa] a [dd/mm/aaaa]
Vínculo: [Nome da Empresa | Contribuinte individual | Facultativo | Doméstico | Outro]
Atividade Especial: [sim | não]
[SE Atividade Especial = sim, incluir se constar na inicial:]
Profissão: [profissão]
Código: [código e número do Decreto]
Agentes Nocivos: [agente(s)]
Resumo: <até 70 palavras; sintetize alegações da inicial e, se houver, controvérsia exposta na contestação e eventuais manifestações (favoráveis ou desfavoráveis) em replica pertinentes ao período
</[PC id=“nn”]>

# REGRAS DA PARTE 1:
1) Gere um bloco para cada período alegado na petição inicial. A ordem dos blocos deve ser cronológica em relação à data inicial do período indicado no bloco.
2) A petição inicial é a base para extração; inserindo-se no Resumo as controvérsias específicas do período trazidas pela contestação e por replica. 
3) Havendo alegação de que certo período não foi reconhecido pelo INSS como tempo contributivo ou carência, o Resumo deve sintetizar as alegações utilizadas pela petição inicial no sentido de considerar tal período.

4) Quando houver diversos períodos relacionados à mesma profissão ou agente nocivo e a petição inicial, contestação ou conteúdo em replica, referir-se a eles de forma geral, inclua as alegações no bloco do primeiro período relacionado à profissão ou agente nocivo. Nos demais blocos, o Resumo deve ser suprimido, exceto quando haja alegação específica (ex.: a concentração do agente nocivo naquele período específico está abaixo de certo limite, o período específico não deve ser computado por falta de provas, etc).
5) Só entram no Resumo controvérsias relacionadas ao período/profissão/código/agentes nocivos.
6) Se a alegação for de período especial em razão de exposição a agente nocivo e a inicial informa a existência de perfil profissiográfico previdenciário (PPP), o Resumo pode restringir-se à expressão “conforme PPP juntado aos autos”. Se houver alegação mais elaborada, o Resumo deve incluir os motivos alegados (fáticos ou jurídicos) para enquadramento, tal como alegações referentes a jurisprudência ou tema repetitivo de TNU, STJ ou STF.
7) Se não houver nenhum contraponto na contestação ou em replica sobre a especialidade ou utilização do período como tempo de contribuição ou carência, o Resumo refletirá apenas o que consta na petição inicial.
8) Suprima as linhas Profissão/Código/Agentes quando Atividade Especial = não.
9) Se houver tabela com diversos períodos na petição inicial, cada período deve gerar um bloco.

## PARTE II – EXTRAÇÃO DE OUTROS ARGUMENTOS DA CONTESTAÇÃO

# Classificação (guia):
Preliminar: inépcia, ilegitimidade, falta de interesse, incompetência, coisa julgada, litispendência, perempção, conexão, etc.
Prejudicial de Mérito: prescrição, decadência.
Mérito: demais teses não vinculadas a período/profissão/código/agente específico.

# FORMATAÇÃO DA RESPOSTA NA PARTE II: A RESPOSTA deve ser estruturada por pontos controvertidos, utilizando os mesma espécie de marcadores da PARTE I: <[PC id=“nn”]> começando com o número subsequente ao último bloco da PARTE I.
<[PC id=“nn”]>
Tipo: <Preliminar | Prejudicial de Mérito | Mérito>
Alegação: <Título curto da tese> 
Resumo: <até 50 palavras; sintetize a tese do réu e, se houver, manifestações em <replica> relacionadas a esta tese geral>
</[PC id=“nn”]>

#REGRAS DA PARTE II:
1) Não inclua na PARTE II alegações que se refiram a período/profissão/código/agente — essas devem ir para o bloco correspondente da Parte I.
2) Não inclua alegações que se refiram a:
a) Adesão ou não a Juízo 100% digital.
b) Interesse ou não em realizar audiência de conciliação.
3) Para as demais teses gerais, classifique como acima e resuma de forma objetiva.
4) Se houver manifestações adicionais (entre os marcadores <replica>) que reforce/contraponha alguma tese geral, agregue no Resumo do bloco da Parte II pertinente.

## PARTE III – EXTRAÇÃO RESIDUAL (somente o que sobrar de <replica>)

Resumo das alegações entre os marcadores <replica> e </replica> que não foram agregados aos resumos dos blocos gerados na PARTE I e PARTE II. Caso não exista nada residual, encerre o processamento.

# FORMATAÇÃO DA RESPOSTA NA PARTE III: A RESPOSTA deve ser estruturada por pontos controvertidos, utilizando os mesma espécie de marcadores da PARTE I: <[PC id=“nn”]> começando com o número subsequente ao último bloco da PARTE II.

<[PC id=“nn”]>
Alegação: < Título curto da tese> 
Resumo: < até 50 palavras; sintetize a tese>
</[PC id=“nn”]>
