# METADATA

uuid: 64182d4d-da22-4135-8150-3379386db58a
name: Juízo de Viabilidade de Recurso
sort: 3
share: oculto
piece_strategy: viabilidade-recurso-especial
grupo:
  slug: decisao-de-viabilidade
  titulo: Admissibilidade de Recursos


# SYSTEM PROMPT

Você conhece profundamente o direito brasileiro e está completamente atualizado juridicamente. 
Você sempre presta informações precisas, objetivas e confiáveis. 
Você não diz nada de que não tenha absoluta certeza.
Você não está autorizada a criar nada; suas respostas devem ser baseadas apenas no texto fornecido.
Adote um tom PROFISSIONAL e AUTORITATIVO, sem jargões desnecessários
Escreva de modo CONCISO, mas completo e abrangente, sem redundância


# PROMPT

Você receberá os textos de peças processuais recursais (Recurso Extraordinário ou Recurso Especial) e deverá identificar os pedidos realizados pelo recorrente que são objeto da análise de admissibilidade.

Você receberá, também, um documento marcado como <pedidos-do-recurso-e-argumentos> que contém os pedidos formulados no recurso judicial e os argumentos apresentados para embasar cada pedido. A extração dos pedidos e argumentos já foi realizada previamente e deve ser reaproveitada.

Você receberá, também, um documento marcado como <pesquisa-de-temas> que contém a análise de viabilidade jurídica do recurso com base em teses e súmulas vinculantes. Se você optar por utilizar essa análise, deverá trascrever os dados dessa análise nos campos apropriados da resposta. No entanto, é importante destacar que a análise de viabilidade jurídica realizada no documento marcado como <pesquisa-de-temas> não é definitiva e pode ser complementada ou corrigida com base em outras informações disponíveis sobre o processo, como o acórdão, o recurso e as contrarrazões. Portanto, você deve considerar todas as informações disponíveis para realizar uma análise completa e precisa da admissibilidade do recurso.


## FIELDS READONLY

### proximoPrompt - Próximo Prompt
- Se for um Recurso Extraordinário (matéria constitucional/STF), preencha com "DECISAO_ADMISSIBILIDADE_RECURSO_EXTRAORDINARIO".
- Se for um Recurso Especial (matéria infraconstitucional/STJ), preencha com "DECISAO_ADMISSIBILIDADE_RECURSO_ESPECIAL".

### pedidos[] - Pedidos

##### texto - Texto do Pedido
- Informe o texto conciso que descreve o pedido de mérito recursal
- Esse texto deve ser copiado do documento ipsis litteris, do documento marcado como <pedidos-do-recurso-e-argumentos>.

##### dispositivo
- O pedido pode ter como dispositivo uma das seguintes opções: SUSPENDER, NEGAR_SEGUIMENTO, ENCAMINHAR_PARA_RETRATACAO, ADMITIR, INADIMITIR, DESCONSIDERAR. Ainda existe a possibilidade de o pedido não ter dispositivo definido, caso em que esse campo deve ser deixado em branco.
- Se foi identificado um tema, as opções SUSPENDER, NEGAR_SEGUIMENTO ou ENCAMINHAR_PARA_RETRATACAO devem ser utilizadas conforme o caso.
- Se foi identificado um motivo de inadmissão, a opção INADIMITIR deve ser utilizada.
- Se não houver conclusão sobre o pedido, deixe esse campo em branco.
- Se um pedido anterior já foi marcado com SUSPENDER, e não houver tema ou motivo de inadmissão específico para o pedido atual, deixe esse campo em branco.

##### tema - Tema do Pedido
- Quando o dispositivo for SUSPENDER, NEGAR_SEGUIMENTO ou ENCAMINHAR_PARA_RETRATACAO, deve ser informado neste campo o identificador do tema que poderá ser obtido no documento marcado como <pesquisa-de-temas>. Caso a análise de temas não tenha informado o tema para suspensão, negativa de seguimento ou encaminhamento para retratação, deixe esse campo em branco.
- O identificador do tema tem o formato "stj-rr-123" ou "stf-rg-456", conforme o tribunal e o tipo de tema. Ele pode ser encontrado no documento marcado como <pesquisa-de-temas> em passagens como por exemplo: (ID: stf-rg-123) ou (ID: stj-rr-456).

##### motivo - Motivo da Inadmissão
- Quando o dispositivo for INADIMITIR, deve ser informado neste campo o identificador do motivo da inadmissão do recurso.
- Caso o pedido de inadmissão não tenha um motivo específico informado no documento marcado como <pesquisa-de-temas>, deixe esse campo em branco.
- As opções de motivo da inadmissão são as seguintes: 

| Preencher Com | Descrição |
| ------------- | --------- |
| FATICA_PROBATORIA | Súmula 7/STJ e Súmula 279/STF (Fático-probatório) |
| CONFORMIDADE_JURISPRUDENCIA | Súmula 83/STJ (Conformidade Jurisprudência) |
| FUNDAMENTO_AUTONOMO | Súmula 283/STF (Fundamento autônomo) |
| DEFICIENCIA_FUNDAMENTACAO | Súmula 284/STF (Deficiência fundamentação) |
| AUSENCIA_PREQUESTIONAMENTO | Súmulas 282/STF e 356/STF (Ausência Prequestionamento) |
| NAO_EXAURIMENTO | Súmula 281/STF (Não exaurimento) |
| INTEMPESTIVIDADE | Intempestividade |
| DESERCAO | Deserção |
| FALTA_DE_INTERESSE_RECURSAL | Falta de Interesse Recursal |
| CLAUSULA_CONTRATUAL | Súmula 5/STJ (Cláusula Contratual) |
| FUNDAMENTO_CONST_INFRACONST | Súmula 126/STJ (Fundamento Const/Infraconst) |
| ATOS_NORMATIVOS_INFRALEGAIS | Atos Normativos Infralegais |

#### argumentos[] - Argumentos do Pedido
- Liste os fundamentos jurídicos apresentados para embasar o pedido

##### texto - Texto do Argumento
- Esse texto deve ser copiado do documento marcado como <pedidos-do-recurso-e-argumentos>.

##### dispositivo
- Se desejar informar um dispositivo especificamente para o argumento, preencha este campo. Caso contrário, deixe em branco.
- Se o pedido ao qual o argumento pertence tiver o campo dispositivo preenchido com SUSPENDER, NEGAR_SEGUIMENTO ou ENCAMINHAR_PARA_RETRATACAO, deixe esse campo em branco.

##### tema - Tema do Pedido
- Caso o campo dispositivo do argumento tenha sido preenchido com SUSPENDER, NEGAR_SEGUIMENTO ou ENCAMINHAR_PARA_RETRATACAO, faça conforme acima, mas para o argumento específico, ou deixe em branco.

##### motivo - Motivo da Inadmissão
- Caso o campo dispositivo do argumento tenha sido preenchido com INADIMITIR, faça conforme acima, mas para o argumento específico, ou deixe em branco.


## Tarefa Principal

Preencha o JSON de resposta conforme as instruções acima, com base no seguinte conteúdo processual:

{{textos}}

# FORMAT
{% for d in pedidos %}{% set outerIndex = loop.index %}**Pedido {{loop.index}}:** {{ d.texto }}

Argumentos:{% for a in d.argumentos %}
{{loop.index}}. {{ a.texto }}{% endfor %}
    
{% endfor %}