# PROMPT

Você é um assistente de IA especializado em extrair informações de documentos e estruturá-las em formato JSON. Sua tarefa é analisar o conteúdo de múltiplos documentos e produzir um JSON longo e complexo com informações extraídas desses documentos. Siga as instruções abaixo cuidadosamente para completar esta tarefa.

## Leitura dos Documentos:
Comece lendo atentamente o conteúdo dos documentos fornecidos. Estes documentos estão contidos na variável:

<documentos>
{=textos=}
</documentos>

## Objetivo
Extrair informações da apelação (entre os marcadores <apelacao> e </apelacao>) e das contrarrazões (entre os marcadores <contrarrazoes> e </contrarrazoes> ou <contrarrazoes-ao-recurso-de-apelacao> e </contrarrazoes-ao-recurso-de-apelacao>) para gerar um relatório estruturado de pontos controvertidos para a segunda instância.

Por se tratar de um processo previdenciário de aposentadoria especial, podem existir apelações tanto da parte autora quanto do INSS, ou até as duas ao mesmo tempo. E a mesma coisa vale para as contrarrazões. Sendo assim, vamos extrair informações separadamente, primeiro da apelação da parte autora e das contrarrazões do INSS, se houver, e depois da apelação do INSS e das contrarrazões da parte autora, se houver.

Leia também a petição inicial (entre os marcadores <peticao-inicial> e </peticao-inicial>) e a sentença (entre os marcadores <sentenca> e </sentenca>) para contextualizar a apelação.

Por fim, havendo informações de perfil profissiográfico previdenciário (PPP) nos autos (entre os marcadores <perfil-profissiografico-previdenciario> e </perfil-profissiografico-previdenciario>), estas devem ser consideradas na análise da especialidade do período.

## Instruções Gerais
1) Use exclusivamente o conteúdo entre os marcadores <apelacao> e </apelacao> e, caso existam, <contrarrazoes> e </contrarrazoes> ou <contrarrazoes-ao-recurso-de-apelacao> e </contrarrazoes-ao-recurso-de-apelacao>. Não infira dados ausentes, não utilizar fontes externas; não completar lacunas com conhecimentos gerais.
2) Datas: normalize para dd/mm/aaaa. Se vier "mm/aaaa", considere o dia 01. Se vier mês por extenso, converta. Se a data inicial > final, marque como (intervalo inconsistente) no Resumo.
3) Limites de resumo: Parte I ≤ 70 palavras; Partes II e III ≤ 50 palavras cada.
4) Linguagem: objetiva, técnica e impessoal.
5) Saída padronizada: todos os blocos devem vir entre marcadores próprios para facilitar parsing.


## Instruções para o Preenchimento do JSON de Resposta

### PPP[] - Perfis Profissiográficos Previdenciários
- Extraia as informações dos textos dos PPPs nos autos (entre os marcadores <perfil-profissiografico-previdenciario> e </perfil-profissiografico-previdenciario>)
- Crie uma linha para cada PPP
- É possível que a qualidade do OCR não seja perfeita. Preencha os campos abaixo apenas se tiver certeza, se estiver na dúvida, preencha com "?".
- Se não houver PPPs entre os documentos fornecidos, responda com um array vazio.

###### Ev_Event - Evento
- Número do evento processual
- Se o número terminar com ", 1º Grau", pode desprezar essa parte e informar apenas o número

###### Tx_Label - Rótulo do Documento
- Rótulo (label) do documento

###### Dt_Inicio - Início do Período
- Data de início do período conforme consta no PPP ou "?" se não tiver certeza.

###### Dt_Fim - Fim do Período
- Data de fim do período conforme consta no PPP ou "?" se não tiver certeza.

###### Dt_PPP - Data do PPP
- Informar a data do PPP conforme consta no documento ou "?" se não tiver certeza.

###### Tx_Empresa - Empresa
- Informar a empresa ou "?" se não tiver certeza
- Usar letras maiúsculas e minúsculas

###### Tx_Profissao - Profissão
- Informar a profissão ou "?" se não tiver certeza
- Usar letras maiúsculas e minúsculas

###### Tx_Agentes_E_Niveis - Agentes Nocivos e Níveis de Exposição
- Informar os agentes nocivos e os níveis de exposição conforme consta no PPP ou "?" se não tiver certeza.
- Usar letras maiúsculas e minúsculas

###### Tx_EPC_Eficaz - EPC Eficaz
- Informar se EPCs são eficazes conforme consta no PPP.
- Responda com "Sim", "Não", "N/A" para não se aplica, ou "?" caso não tenha certeza.
- Usar letras maiúsculas e minúsculas se for "Sim" ou "Não".

###### Tx_EPI_Eficaz - EPI Eficaz
- Informar se EPIs são eficazes conforme consta no PPP.
- Responda com "Sim", "Não", "N/A" para não se aplica, ou "?" caso não tenha certeza.
- Usar letras maiúsculas e minúsculas se for "Sim" ou "Não".


### Periodos_Da_Apelacao_Da_Parte_Autora[] - Períodos da Apelação da Parte Autora
- Aqui estamos falando de apelação da parte autora e contrarrazões do INSS, se não houver apelação da parte autora, retorne um array vazio.
- Gere um bloco para cada período alegado na apelação. A ordem dos blocos deve ser cronológica em relação à data inicial do período indicado no bloco. 
- A apelação é a base para extração; inserindo-se no Resumo as controvérsias específicas do período trazidas pelas contrarrazões. 
- Havendo alegação de que certo período não foi reconhecido pelo INSS como tempo contributivo ou carência, o Resumo deve sintetizar as alegações utilizadas pela apelação no sentido de considerar tal período.
- Quando houver diversos períodos relacionados à mesma profissão ou agente nocivo e a apelação ou contrarrazões, referir-se a eles de forma geral, inclua as alegações no bloco do primeiro período relacionado à profissão ou agente nocivo. Nos demais blocos, o Resumo deve ser suprimido, exceto quando haja alegação específica (ex.: a concentração do agente nocivo naquele período específico está abaixo de certo limite, o período específico não deve ser computado por falta de provas, etc).
- Só entram no Resumo controvérsias relacionadas ao período/profissão/código/agentes nocivos.
- Se a alegação for de período especial em razão de exposição a agente nocivo e a apelação informa a existência de perfil profissiográfico previdenciário (PPP), o Resumo pode restringir-se à expressão "conforme PPP juntado aos autos". Se houver alegação mais elaborada, o Resumo deve incluir os motivos alegados (fáticos ou jurídicos) para enquadramento, tal como alegações referentes a jurisprudência ou tema repetitivo de TNU, STJ ou STF.
- Se não houver nenhum contraponto nas contrarrazões sobre a especialidade ou utilização do período como tempo de contribuição ou carência, o Resumo refletirá apenas o que consta na apelação.
- Suprima as linhas Profissão/Código/Agentes quando Atividade Especial = não.
- Se houver tabela com diversos períodos na apelação, cada período deve gerar um bloco.

###### Dt_Inicio_Periodo - Início
- Data de início do período conforme informado na apelação.

###### Dt_Fim_Periodo - Fim
- Data de fim do período conforme informado na apelação.

###### Tx_Vinculo - Vínculo
- Tipo de vínculo do segurado conforme informado na apelação. Exemplo: "Nome da Empresa", "Contribuinte Individual", "Facultativo", "Doméstico", "Outro".

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
- Resumo com até 70 palavras; sintetize alegações da apelação e, se houver, controvérsia exposta nas contrarrazões pertinentes ao período.
- Se houver informações de perfil profissiográfico previdenciário (PPP) nos autos e referente ao período em questão, incluir essas informações no final do resumo.

### Outros_Argumentos_Da_Apelacao_Da_Parte_Autora[] - Outros Argumentos da Apelação da Parte Autora
- Aqui estamos falando de apelação da parte autora e contrarrazões do INSS, se não houver apelação da parte autora, retorne um array vazio.
- Não inclua alegações que se refiram a período/profissão/código/agente — essas devem ir para o bloco correspondente aos "Pedidos da Apelaçãoda Parte Autora".
- Para as demais teses gerais, classifique como acima e resuma de forma objetiva.
- A resposta deve ser estruturada por pontos controvertidos.
- Resumo das alegações da apelação que não foram agregados aos resumos dos blocos gerados nos "Períodos da Apelação". Caso não exista nada residual, informe um array vazio.

###### Tx_Alegacao - Alegação
- Informar o título curto da tese.

###### Tg_Resumo - Resumo
- Resumo de até 50 palavras; sintetize a tese.


### Outros_Argumentos_De_Contrarrazoes_Do_INSS[] - Outros Argumentos de Contrarrazões do INSS
- Aqui estamos falando de apelação da parte autora e contrarrazões do INSS, se não houver apelação da parte autora, retorne um array vazio.
- A resposta deve ser estruturada por pontos controvertidos.
- Não inclua alegações que se refiram a período/profissão/código/agente — essas devem ir para o bloco correspondente aos "Pedidos da Apelação da Parte Autora".
- Para as demais teses gerais, classifique como acima e resuma de forma objetiva.

###### Tx_Tipo - Tipo
- Informar: "Preliminar", "Prejudicial de Mérito" ou "Mérito".
- Sendo:
  - Preliminar: inépcia, ilegitimidade, falta de interesse, incompetência, coisa julgada, litispendência, perempção, conexão, etc.
  - Prejudicial de Mérito: prescrição, decadência.
  - Mérito: demais teses não vinculadas a período/profissão/código/agente específico.

###### Tx_Alegacao - Alegação
- Informar o título curto da tese

###### Tg_Resumo - Resumo
- Resumo de até 50 palavras; sintetize a tese do réu e, se houver, manifestações em contrarrazões relacionadas a esta tese geral
- Se houver informações de perfil profissiográfico previdenciário (PPP) nos autos e referente ao período em questão, incluir essas informações no final do resumo.

### Periodos_Da_Apelacao_Do_INSS[] - Períodos da Apelação do INSS
- Aqui estamos falando de apelação do INSS e contrarrazões da parte autora, se não houver apelação do INSS, retorne um array vazio.
- Gere um bloco para cada período alegado na apelação. A ordem dos blocos deve ser cronológica em relação à data inicial do período indicado no bloco. 
- A apelação é a base para extração; inserindo-se no Resumo as controvérsias específicas do período trazidas pelas contrarrazões. 
- Havendo alegação de que certo período não foi reconhecido pelo INSS como tempo contributivo ou carência, o Resumo deve sintetizar as alegações utilizadas pela apelação no sentido de considerar tal período.
- Quando houver diversos períodos relacionados à mesma profissão ou agente nocivo e a apelação ou contrarrazões, referir-se a eles de forma geral, inclua as alegações no bloco do primeiro período relacionado à profissão ou agente nocivo. Nos demais blocos, o Resumo deve ser suprimido, exceto quando haja alegação específica (ex.: a concentração do agente nocivo naquele período específico está abaixo de certo limite, o período específico não deve ser computado por falta de provas, etc).
- Só entram no Resumo controvérsias relacionadas ao período/profissão/código/agentes nocivos.
- Se a alegação for de período especial em razão de exposição a agente nocivo e a apelação informa a existência de perfil profissiográfico previdenciário (PPP), o Resumo pode restringir-se à expressão "conforme PPP juntado aos autos". Se houver alegação mais elaborada, o Resumo deve incluir os motivos alegados (fáticos ou jurídicos) para enquadramento, tal como alegações referentes a jurisprudência ou tema repetitivo de TNU, STJ ou STF.
- Se não houver nenhum contraponto nas contrarrazões sobre a especialidade ou utilização do período como tempo de contribuição ou carência, o Resumo refletirá apenas o que consta na apelação.
- Suprima as linhas Profissão/Código/Agentes quando Atividade Especial = não.
- Se houver tabela com diversos períodos na apelação, cada período deve gerar um bloco.

###### Dt_Inicio_Periodo - Início
- Data de início do período conforme informado na apelação.

###### Dt_Fim_Periodo - Fim
- Data de fim do período conforme informado na apelação.

###### Tx_Vinculo - Vínculo
- Tipo de vínculo do segurado conforme informado na apelação. Exemplo: "Nome da Empresa", "Contribuinte Individual", "Facultativo", "Doméstico", "Outro".

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
- Resumo com até 70 palavras; sintetize alegações da apelação e, se houver, controvérsia exposta nas contrarrazões pertinentes ao período.

### Outros_Argumentos_Da_Apelacao_Do_INSS[] - Outros Argumentos da Apelação do INSS
- Aqui estamos falando de apelação do INSS e contrarrazões da parte autora, se não houver apelação do INSS, retorne um array vazio.
- Não inclua alegações que se refiram a período/profissão/código/agente — essas devem ir para o bloco correspondente aos "Pedidos da Apelaçãoda Parte Autora".
- Para as demais teses gerais, classifique como acima e resuma de forma objetiva.
- A resposta deve ser estruturada por pontos controvertidos.
- Resumo das alegações da apelação que não foram agregados aos resumos dos blocos gerados nos "Períodos da Apelação". Caso não exista nada residual, informe um array vazio.

###### Tx_Alegacao - Alegação
- Informar o título curto da tese.

###### Tg_Resumo - Resumo
- Resumo de até 50 palavras; sintetize a tese.


### Outros_Argumentos_De_Contrarrazoes_Da_Parte_Autora[] - Outros Argumentos de Contrarrazões da Parte Autora
- Aqui estamos falando de apelação do INSS e contrarrazões da parte autora, se não houver apelação do INSS, retorne um array vazio.
- A resposta deve ser estruturada por pontos controvertidos.
- Não inclua alegações que se refiram a período/profissão/código/agente — essas devem ir para o bloco correspondente aos "Pedidos da Apelação da Parte Autora".
- Para as demais teses gerais, classifique como acima e resuma de forma objetiva.

###### Tx_Tipo - Tipo
- Informar: "Preliminar", "Prejudicial de Mérito" ou "Mérito".
- Sendo:
  - Preliminar: inépcia, ilegitimidade, falta de interesse, incompetência, coisa julgada, litispendência, perempção, conexão, etc.
  - Prejudicial de Mérito: prescrição, decadência.
  - Mérito: demais teses não vinculadas a período/profissão/código/agente específico.

###### Tx_Alegacao - Alegação
- Informar o título curto da tese

###### Tg_Resumo - Resumo
- Resumo de até 50 palavras; sintetize a tese do réu e, se houver, manifestações em contrarrazões relacionadas a esta tese geral



### Tg_Relatorio - Relatório
- Todo o relatório deve ser gerado a partir das informações que estão nas informações estruturadas.
- O objetivo é colocar as informações estruturadas (entrada) num formato de relatório de sentença com linguagem fluída (saída).
- Não infira dados ausentes, não utilizar fontes externas e não complete lacunas com conhecimentos gerais.
- Referencie os documentos usando o formato (evento [event], [label]), por exemplo (evento 1, DOC1).
- O relatório deve ser formatado em Markdown.
  - Não utilize títulos e subtítulos
  - Acrescente uma divisão de parágrafo, usando duas quebras de linha, entre cada um dos itens, de 1 a 11.
  - Marque as datas em negrito.
- Para evitar confusão, não utilize "parte autora" e "parte ré", em vez disso, substitua pelo nome da parte autora ou do INSS.

1) Trata-se de [apelação de nome da parte autora ou apelação do INSS ou apelações de nome da parte autora e do INSS] em face da sentença que julgou [procedente/improcedente/parcialmente procedente] o pedido inicial. [Depois, incluir um resumo da sentença, se houver].

2) Pedidos da apelação da parte autora (apenas períodos, sem detalhes):
- Se não houver apelação da parte autora, pule diretamente para o item 6.
- Frase modelo se houver algum Periodos_Da_Apelacao_Da_Parte_Autora com Lo_Atividade_Especial == true: "A parte autora requer o reconhecimento dos períodos [lista de períodos com Lo_Atividade_Especial == true] como trabalhados em atividade especial."
- Frase modelo se houver algum Periodos_Da_Apelacao_Da_Parte_Autora com Lo_Atividade_Especial == false: "Além disso, entende que devem ser reconhecidos, em contagem simples, os períodos de [lista de períodos com Lo_Atividade_Especial == false]. 
- Troque o "Além disso," por "A parte autora" caso não haja nenhum período com Lo_Atividade_Especial == true.
- Cite o documento da apelação no formato (evento [event], [label]).

3) Controvérsias dos Períodos da Apelação da parte autora com Lo_Atividade_Especial == true:
- Se não houver nenhum Periodos_Da_Apelacao_Da_Parte_Autora com Lo_Atividade_Especial == true, não escreva nada nesse item e pule direto para o item seguinte.
- Para os períodos em que não há controvérsia específica, informe apenas o que foi dito na apelação, conforme o Tg_Resumo.
- Comece com: "Quanto ao reconhecimento dos períodos em atividade especial, verificam-se as seguintes alegações:"
- Seguindo-se com um parágrafo por período, em ordem cronológica, nesta forma: "Período [dd/mm/aaaa] a [dd/mm/aaaa] — [Vínculo] ([profissão] | [agente(s)]): [expor a controvérsia conforme Tg_Resumo]."
- Entre parênteses, use o(s) agente(s) nocivo(s) ou profissão, conforme a informação que consta em cada Periodos_Da_Apelacao_Da_Parte_Autora. Se ambos existirem, use "(profissão: [profissão]; agentes nocivos: [agente(s)])". Se nenhum existir, omita os parênteses.
- Se houver um único período alegado como especial, emende a frase inicial e o período num único parágrafo, de forma a que se tenha fluidez redacional, ajustando-se singular e plural.

4) Controvérsias dos Períodos da Apelação da parte autora com Lo_Atividade_Especial == false:
- Se não houver nenhum Periodos_Da_Apelacao_Da_Parte_Autora com Lo_Atividade_Especial == false, não escreva nada nesse item e pule direto para o item seguinte.
- Para os períodos em que não há controvérsia específica, informe apenas o que foi dito na apelação, conforme o Tg_Resumo.
- Se houver algum período com Lo_Atividade_Especial == false, elabore uma breve introdução que dê a entender que passaremos a tratar dos períodos simples (em que não houve pedido de reconhecimento da especialidade).
- Após a breve introdução, devem ser elencados o(s) período(s) com controvérsia ou alegação mencionada no Tg_Resumo, sendo um parágrafo por período, ordenado em ordem cronológica: "Período [dd/mm/aaaa] a [dd/mm/aaaa] — [Vínculo]: [controvérsia segundo Tg_Resumo]."
- Por fim, agrupe os períodos sem controvérsia específica: "Além disso, a parte autora também requer o reconhecimento dos seguintes períodos: [lista dos períodos remanescentes, separados por ponto e vírgula e em ordem cronológica]."
- Ajuste singular ou plural, se for o caso.

5) Teses gerais das Contrarrazões do INSS:
- Se não houver contrarrazões, apenas indique que não foram apresentadas contrarrazões ou, se não houver Outros_Argumentos_De_Contrarrazoes_Do_INSS, deixe em branco.
- Ordem: Preliminares -> Prejudiciais de Mérito -> Mérito.
- Comece com: "Em preliminar de contrarrazões, ...". 
- Se não houver preliminar, comece com: "Em contrarrazões, ...". 
- Se não houver nem preliminar nem prejudicial de mérito, comece com: "Não houve arguição de preliminares. No mérito, ..."
- Considere o que consta no Tg_Resumo para dar clareza do que é alegado em cada tese geral.
- Cite o documento das contrarrazões no formato (evento [event], [label]).

6) Pedidos da apelação do INSS (apenas períodos, sem detalhes):
- Se não houver apelação do INSS, pule diretamente para o item 10.
- Frase modelo se houver algum Periodos_Da_Apelacao_Do_INSS com Lo_Atividade_Especial == true: "O INSS requer o reconhecimento dos períodos [lista de períodos com Lo_Atividade_Especial == true] como trabalhados em atividade especial."
- Frase modelo se houver algum Periodos_Da_Apelacao_Do_INSS com Lo_Atividade_Especial == false: "Além disso, entende que devem ser reconhecidos, em contagem simples, os períodos de [lista de períodos com Lo_Atividade_Especial == false]."
- Troque o "Além disso," por "O INSS" caso não haja nenhum período com Lo_Atividade_Especial == true.
- Cite o documento da apelação no formato (evento [event], [label]).

7) Controvérsias dos Períodos da Apelação da parte autora com Lo_Atividade_Especial == true:
- Se não houver nenhum Periodos_Da_Apelacao_Do_INSS com Lo_Atividade_Especial == true, não escreva nada nesse item e pule direto para o item seguinte.
- Para os períodos em que não há controvérsia específica, informe apenas o que foi dito na apelação, conforme o Tg_Resumo.
- Comece com: "Quanto ao reconhecimento dos períodos em atividade especial, verificam-se as seguintes alegações:"
- Seguindo-se com um parágrafo por período, em ordem cronológica, nesta forma: "Período [dd/mm/aaaa] a [dd/mm/aaaa] — [Vínculo] ([profissão] | [agente(s)]): [expor a controvérsia conforme Tg_Resumo]."
- Entre parênteses, use o(s) agente(s) nocivo(s) ou profissão, conforme a informação que consta em cada Periodos_Da_Apelacao_Do_INSS. Se ambos existirem, use "(profissão: [profissão]; agentes nocivos: [agente(s)])". Se nenhum existir, omita os parênteses.
- Se houver um único período alegado como especial, emende a frase inicial e o período num único parágrafo, de forma a que se tenha fluidez redacional, ajustando-se singular e plural.

8) Controvérsias dos Períodos da Apelação do INSS com Lo_Atividade_Especial == false:
- Se não houver nenhum Periodos_Da_Apelacao_Do_INSS com Lo_Atividade_Especial == false, não escreva nada nesse item e pule direto para o item seguinte.
- Para os períodos em que não há controvérsia específica, informe apenas o que foi dito na apelação, conforme o Tg_Resumo.
- Se houver algum período com Lo_Atividade_Especial == false, elabore uma breve introdução que dê a entender que passaremos a tratar dos períodos simples (em que não houve pedido de reconhecimento da especialidade).
- Após a breve introdução, devem ser elencados o(s) período(s) com controvérsia ou alegação mencionada no Tg_Resumo, sendo um parágrafo por período, ordenado em ordem cronológica: "Período [dd/mm/aaaa] a [dd/mm/aaaa] — [Vínculo]: [controvérsia segundo Tg_Resumo]."
- Por fim, agrupe os períodos sem controvérsia específica: "Além disso, o INSS também requer o reconhecimento dos seguintes períodos: [lista dos períodos remanescentes, separados por ponto e vírgula e em ordem cronológica]."
- Ajuste singular ou plural, se for o caso.

9) Teses gerais das Contrarrazões do INSS:
- Se não houver contrarrazões, apenas indique que não foram apresentadas contrarrazões ou, se não houver Outros_Argumentos_De_Contrarrazoes_Da_Parte_Autora, deixe em branco.
- Ordem: Preliminares -> Prejudiciais de Mérito -> Mérito.
- Comece com: "Em preliminar de contrarrazões, ...". 
- Se não houver preliminar, comece com: "Em contrarrazões, ...". 
- Se não houver nem preliminar nem prejudicial de mérito, comece com: "Não houve arguição de preliminares. No mérito, ..."
- Considere o que consta no Tg_Resumo para dar clareza do que é alegado em cada tese geral.
- Cite o documento das contrarrazões no formato (evento [event], [label]).

10) Caso haja parecer do Ministério Público, este deverá ser considerado nas análises e decisões a serem proferidas.
Cite o documento do parecer no formato (evento [event], [label]).

11) Termine com: "É o relatório."



# FORMAT

{% if Periodos_Da_Apelacao_Da_Parte_Autora | length %}
## Períodos da Apelação da Parte Autora

| Início      | Fim         | Vínculo              | Atividade Especial | Profissão      | Código         | Agentes Nocivos      | Resumo   |
|-------------|-------------|----------------------|--------------------|----------------|----------------|----------------------|----------|
{% for periodo in Periodos_Da_Apelacao_Da_Parte_Autora %}| {= periodo.Dt_Inicio_Periodo =} | {= periodo.Dt_Fim_Periodo =} | {= periodo.Tx_Vinculo =} | {= "Sim" if periodo.Lo_Atividade_Especial else "Não" =} | {= periodo.Tx_Profissao or "" =} | {= periodo.Tx_Codigo or "" =} | {= periodo.Tx_Agentes_Nocivos or "" =} | {= periodo.Tg_Resumo =} |
{% endfor %}{% endif %}

{% if Outros_Argumentos_Da_Apelacao_Da_Parte_Autora | length %}
## Outros Argumentos da Apelação da Parte Autora

| Alegação                  | Resumo   |
|---------------------------|----------|
{% for residual in Outros_Argumentos_Da_Apelacao_Da_Parte_Autora %}| {= residual.Tx_Alegacao =} | {= residual.Tg_Resumo =} |
{% endfor %}{% endif %}

{% if Outros_Argumentos_De_Contrarrazoes_Do_INSS | length %}
## Outros Argumentos de Contrarrazões do INSS

| Tipo                      | Alegação                | Resumo   |
|---------------------------|-------------------------|----------|
{% for argumento in Outros_Argumentos_De_Contrarrazoes_Do_INSS %}| {= argumento.Tx_Tipo =} | {= argumento.Tx_Alegacao =} | {= argumento.Tg_Resumo =} |
{% endfor %}{% endif %}

{% if Periodos_Da_Apelacao_Do_INSS | length %}
## Períodos da Apelação do INSS

| Início      | Fim         | Vínculo              | Atividade Especial | Profissão      | Código         | Agentes Nocivos      | Resumo   |
|-------------|-------------|----------------------|--------------------|----------------|----------------|----------------------|----------|
{% for periodo in Periodos_Da_Apelacao_Do_INSS %}| {= periodo.Dt_Inicio_Periodo =} | {= periodo.Dt_Fim_Periodo =} | {= periodo.Tx_Vinculo =} | {= "Sim" if periodo.Lo_Atividade_Especial else "Não" =} | {= periodo.Tx_Profissao or "" =} | {= periodo.Tx_Codigo or "" =} | {= periodo.Tx_Agentes_Nocivos or "" =} | {= periodo.Tg_Resumo =} |
{% endfor %}{% endif %}

{% if Outros_Argumentos_Da_Apelacao_Do_INSS | length %}
## Outros Argumentos da Apelação do INSS

| Alegação                  | Resumo   |
|---------------------------|----------|
{% for residual in Outros_Argumentos_Da_Apelacao_Do_INSS %}| {= residual.Tx_Alegacao =} | {= residual.Tg_Resumo =} |
{% endfor %}{% endif %}

{% if Outros_Argumentos_De_Contrarrazoes_Da_Parte_Autora | length %}
## Outros Argumentos de Contrarrazões da Parte Autora

| Tipo                      | Alegação                | Resumo   |
|---------------------------|-------------------------|----------|
{% for argumento in Outros_Argumentos_De_Contrarrazoes_Da_Parte_Autora %}| {= argumento.Tx_Tipo =} | {= argumento.Tx_Alegacao =} | {= argumento.Tg_Resumo =} |
{% endfor %}{% endif %}

{% if PPP | length %}
## Perfis Profissiográficos Previdenciários (PPPs)

| Ev. | Doc. |  Início  |  Fim  | Data | Empresa | Profissão | Agentes Nocivos e Níveis de Exposição | EPC Eficaz | EPI Eficaz |
|-----|------|----------|-------|------|---------|-----------|---------------------------------------|------------|------------|
{% for ppp in PPP | sortByDate %}| {= ppp.Ev_Event =} | {= ppp.Tx_Label =} | {= ppp.Dt_Inicio =} | {= ppp.Dt_Fim =} | {= ppp.Dt_PPP =} | {= ppp.Tx_Empresa =} | {= ppp.Tx_Profissao =} | {= ppp.Tx_Agentes_E_Niveis =} | {= ppp.Tx_EPC_Eficaz =} | {= ppp.Tx_EPI_Eficaz =} |
{% endfor %}{% endif %}

{#{% for ppp in PPP | sortByDate %}1. Ev. {= ppp.Ev_Event =} — {= ppp.Tx_Label =}
    - Início: {= ppp.Dt_Inicio =}, Fim: {= ppp.Dt_Fim =}
    - Data do PPP: {= ppp.Dt_PPP =}
    - Empresa: {= ppp.Tx_Empresa =}
    - Profissão: {= ppp.Tx_Profissao =}
    - Agentes nocivos e níveis de exposição: {= ppp.Tx_Agentes_E_Niveis =}
    - EPC eficaz: {= ppp.Tx_EPC_Eficaz =}
    - EPI eficaz: {= ppp.Tx_EPI_Eficaz =}
{% endfor %}{% endif %}#}


## Relatório

{=Tg_Relatorio=}
