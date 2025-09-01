# PROMPT

Você é um assistente de IA especializado em extrair informações de documentos e estruturá-las em formato JSON. Sua tarefa é analisar o conteúdo de múltiplos documentos e produzir um JSON longo e complexo com informações extraídas desses documentos. Siga as instruções abaixo cuidadosamente para completar esta tarefa.

## Leitura dos Documentos:
Comece lendo atentamente o conteúdo dos documentos fornecidos. Estes documentos estão contidos na variável:

<documentos>
{{textos}}
</documentos>

## Objetivo
Extrair informações da petição inicial (entre os marcadores <peticao-inicial> e </peticao-inicial>) e da contestação (entre os marcadores <contestacao> e </contestacao>) para gerar um relatório estruturado de pontos controvertidos. Se houver algum conteúdo entre os marcadores <replica> e </replica>, inclua-o na análise, considerando que se trata de uma ou mais manifestações adicionais do autor ou do réu.

## Instruções Gerais
1) Use exclusivamente o conteúdo entre os marcadores <peticao-inicial> ... </peticao-inicial> e, caso existam, <contestacao> ... </contestacao> e <replica> ... </replica>. Não infira dados ausentes, não utilizar fontes externas; não completar lacunas com conhecimentos gerais.
2) Datas: normalize para dd/mm/aaaa. Se vier "mm/aaaa", considere o dia 01. Se vier mês por extenso, converta. Se a data inicial > final, marque como (intervalo inconsistente) no Resumo.
3) Limites de resumo: Parte I ≤ 70 palavras; Partes II e III ≤ 50 palavras cada.
4) Linguagem: objetiva, técnica e impessoal.
5) Saída padronizada: todos os blocos devem vir entre marcadores próprios para facilitar parsing.


## Instruções para o Preenchimento do JSON de Resposta

### Periodos[] - Períodos da Petição Inicial
- Gere um bloco para cada período alegado na petição inicial. A ordem dos blocos deve ser cronológica em relação à data inicial do período indicado no bloco.
- A petição inicial é a base para extração; inserindo-se no Resumo as controvérsias específicas do período trazidas pela contestação e por replica. 
- Havendo alegação de que certo período não foi reconhecido pelo INSS como tempo contributivo ou carência, o Resumo deve sintetizar as alegações utilizadas pela petição inicial no sentido de considerar tal período.
- Quando houver diversos períodos relacionados à mesma profissão ou agente nocivo e a petição inicial, contestação ou conteúdo em replica, referir-se a eles de forma geral, inclua as alegações no bloco do primeiro período relacionado à profissão ou agente nocivo. Nos demais blocos, o Resumo deve ser suprimido, exceto quando haja alegação específica (ex.: a concentração do agente nocivo naquele período específico está abaixo de certo limite, o período específico não deve ser computado por falta de provas, etc).
- Só entram no Resumo controvérsias relacionadas ao período/profissão/código/agentes nocivos.
- Se a alegação for de período especial em razão de exposição a agente nocivo e a inicial informa a existência de perfil profissiográfico previdenciário (PPP), o Resumo pode restringir-se à expressão "conforme PPP juntado aos autos". Se houver alegação mais elaborada, o Resumo deve incluir os motivos alegados (fáticos ou jurídicos) para enquadramento, tal como alegações referentes a jurisprudência ou tema repetitivo de TNU, STJ ou STF.
- Se não houver nenhum contraponto na contestação ou em replica sobre a especialidade ou utilização do período como tempo de contribuição ou carência, o Resumo refletirá apenas o que consta na petição inicial.
- Suprima as linhas Profissão/Código/Agentes quando Atividade Especial = não.
- Se houver tabela com diversos períodos na petição inicial, cada período deve gerar um bloco.

###### Dt_Inicio_Periodo - Início
- Data de início do período conforme informado na petição inicial.

###### Dt_Fim_Periodo - Fim
- Data de fim do período conforme informado na petição inicial.

###### Tx_Vinculo - Vínculo
- Tipo de vínculo do segurado conforme informado na petição inicial. Exemplo: "Nome da Empresa", "Contribuinte Individual", "Facultativo", "Doméstico", "Outro".

###### Lo_Atividade_Especial - Atividade Especial
- Indica se o período é de atividade especial.

###### Tx_Profissao - Profissão
- Informar a profissão
- SE Lo_Atividade_Especial == false, deixar vazio.

###### Tx_Codigo - Código
- Informar código e número do Decreto.
- SE Lo_Atividade_Especial == false, deixar vazio.

###### Tx_Agentes_Nocivos - Agentes Nocivos
- Informar nome do(s) agente(s) nocivo(s).
- SE Lo_Atividade_Especial == false, deixar vazio.

###### Tg_Resumo - Resumo
- Resumo com até 70 palavras; sintetize alegações da inicial e, se houver, controvérsia exposta na contestação e eventuais manifestações (favoráveis ou desfavoráveis) em replica pertinentes ao período.

### Outros_Argumentos[] - Outros Argumentos da Contestação
- A resposta deve ser estruturada por pontos controvertidos.
- Não inclua na PARTE II alegações que se refiram a período/profissão/código/agente — essas devem ir para o bloco correspondente da Parte I.
- Não inclua alegações que se refiram a:
  - Adesão ou não a Juízo 100% digital.
  - Interesse ou não em realizar audiência de conciliação.
- Para as demais teses gerais, classifique como acima e resuma de forma objetiva.
- Se houver manifestações adicionais (entre os marcadores <replica>) que reforce/contraponha alguma tese geral, agregue no resumo do bloco pertinente.

###### Tx_Tipo - Tipo
- Informar: "Preliminar", "Prejudicial de Mérito" ou "Mérito".
- Sendo:
  - Preliminar: inépcia, ilegitimidade, falta de interesse, incompetência, coisa julgada, litispendência, perempção, conexão, etc.
  - Prejudicial de Mérito: prescrição, decadência.
  - Mérito: demais teses não vinculadas a período/profissão/código/agente específico.

###### Tx_Alegacao - Alegação
- Informar o título curto da tese

###### Tg_Resumo - Resumo
- Resumo de até 50 palavras; sintetize a tese do réu e, se houver, manifestações em replica relacionadas a esta tese geral


### Residual[] - Extração Residual
- A resposta deve ser estruturada por pontos controvertidos.
- Resumo das alegações entre os marcadores <replica> e </replica> que não foram agregados aos resumos dos blocos gerados nos "Períodos da Petição Inicial" nem nos "Outros Argumentos da Contestação". Caso não exista nada residual, informe um array vazio.

###### Tx_Alegacao - Alegação
- Informar o título curto da tese.

###### Tg_Resumo - Resumo
- Resumo de até 50 palavras; sintetize a tese.

### Tg_Relatorio - Relatório
- Todo o relatório deve ser gerado a partir das informações que estão nas informações estruturadas.
- O objetivo é colocar as informações estruturadas (entrada) num formato de relatório de sentença com linguagem fluída (saída).
- Não infira dados ausentes, não utilizar fontes externas e não complete lacunas com conhecimentos gerais.
- O relatório deve ser formatado em Markdown.
  - Não utilize títulos e subtítulos
  - Acrescente uma divisão de parágrafo, usando duas quebras de linha, entre cada um dos itens, de 1 a 6.
  - Marque as datas em negrito.

1) Abertura obrigatória: o relatório deve começar com o seguinte parágrafo: "A presente ação tem como objeto a concessão de aposentadoria". Se nas informações estruturadas houver algum período com Lo_Atividade_Especial == true, complemente: ", com reconhecimento de tempo laborado em condições especiais.". Ajuste a pontuação.

2) Pedidos da inicial (apenas períodos, sem detalhes):
Frase modelo se houver algum período com Lo_Atividade_Especial == true:
"A parte autora requer o reconhecimento dos períodos [lista de períodos com Lo_Atividade_Especial == true] como trabalhados em atividade especial."
Frase modelo se houver algum período com Lo_Atividade_Especial == false:
"Além disso, entende que devem ser reconhecidos, em contagem simples, os períodos de [lista de períodos com Lo_Atividade_Especial == false]. – Troque o "Além disso," por "A parte autora" caso não haja nenhum período com Lo_Atividade_Especial == true.

3) Teses gerais do réu (FORMATO 2):
Ordem: Preliminares -> Prejudiciais de Mérito -> Mérito.
Comece com: "Em preliminar de contestação, o INSS...". 
Se não houver preliminar, comece com: "Em contestação, o INSS pleiteia o reconhecimento da prescrição quinquenal...". 
Se não houver nem preliminar nem prejudicial de mérito, comece com: "Não houve arguição de preliminares pelo INSS. No mérito, a autarquia..."
Considere o que consta no Resumo para dar clareza do que é alegado em cada tese geral.

4) Controvérsias dos Períodos da Petição Inicial com Lo_Atividade_Especial == true: Comece com: "Quanto ao reconhecimento dos períodos em atividade especial, verificam-se as seguintes alegações:"
Seguindo-se com um parágrafo por período, em ordem cronológica, nesta forma:
"Período [dd/mm/aaaa] a [dd/mm/aaaa] — [Vínculo] ([profissão] | [agente(s)]): [expor a controvérsia conforme o Resumo do bloco]."
Entre parênteses, use o(s) agente(s) nocivo(s) ou profissão, conforme a informação que consta em cada bloco. Se ambos existirem, use "(profissão: [profissão]; agentes nocivos: [agente(s)])". Se nenhum existir, omita os parênteses.
Se houver um único período alegado como especial, emende a frase inicial e o período num único parágrafo, de forma a que se tenha fluidez redacional, ajustando-se singular e plural. Se não houver nenhum período com "Atividade Especial: sim", pule diretamente para o próximo item.

5) Controvérsias dos Períodos da Petição Inicial com Lo_Atividade_Especial == false:
Se houver algum período com Lo_Atividade_Especial == false, elabore uma breve introdução que dê a entender que passaremos a tratar dos períodos simples (em que não houve pedido de reconhecimento da especialidade). Se não houver nenhum período com Lo_Atividade_Especial == false, pule para o item 6.
Após a breve introdução, devem ser elencados o(s) período(s) com controvérsia ou alegação mencionada no Resumo, sendo um parágrafo por período, ordenado em ordem cronológica:
"Período [dd/mm/aaaa] a [dd/mm/aaaa] — [Vínculo]: [controvérsia segundo Resumo]."
Por fim, agrupe os períodos sem controvérsia específica:
"Além disso, a parte autora também requer o reconhecimento dos seguintes períodos: [lista dos períodos remanescentes, separados por ponto e vírgula e em ordem cronológica]."
Ajuste singular ou plural, se for o caso.

6) Termine com: "É o relatório. Decido."



# FORMAT

## Períodos da Petição Inicial

| Início      | Fim         | Vínculo              | Atividade Especial | Profissão      | Código         | Agentes Nocivos      | Resumo   |
|-------------|-------------|----------------------|--------------------|----------------|----------------|----------------------|----------|
{% for periodo in Periodos %}| {{ periodo.Dt_Inicio_Periodo }} | {{ periodo.Dt_Fim_Periodo }} | {{ periodo.Tx_Vinculo }} | {{ "Sim" if periodo.Lo_Atividade_Especial else "Não" }} | {{ periodo.Tx_Profissao or "" }} | {{ periodo.Tx_Codigo or "" }} | {{ periodo.Tx_Agentes_Nocivos or "" }} | {{ periodo.Tg_Resumo }} |
{% endfor %}

## Outros Argumentos da Contestação

| Tipo                      | Alegação                | Resumo   |
|---------------------------|-------------------------|----------|
{% for argumento in Outros_Argumentos %}| {{ argumento.Tx_Tipo }} | {{ argumento.Tx_Alegacao }} | {{ argumento.Tg_Resumo }} |
{% endfor %}

## Extração Residual

| Alegação                  | Resumo   |
|---------------------------|----------|
{% for residual in Residual %}| {{ residual.Tx_Alegacao }} | {{ residual.Tg_Resumo }} |
{% endfor %}

## Relatório

<!-- add: <ins class="diffins-highlight"> -->
{=Tg_Relatorio=}
<!-- add: </ins> -->
