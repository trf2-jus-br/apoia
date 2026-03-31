# METADATA

uuid: cf0c8ba9-ecad-41bd-8cf1-4554c0f18467
name: Sentenca BI - Laudo Favoravel
sort: 1000
share: beta-teste
piece_strategy: conhecimento
successors:
  - path: chat


# PROMPT

Você é um assistente de IA especializado em extrair informações de documentos e estruturá-las em formato JSON. Sua tarefa é analisar o conteúdo de múltiplos documentos e produzir um JSON longo e complexo com informações extraídas desses documentos. Siga as instruções abaixo cuidadosamente para completar esta tarefa.

## Leitura dos Documentos:
Comece lendo atentamente o conteúdo dos documentos fornecidos. Estes documentos estão contidos na variável:

<documentos>
{{textos}}
</documentos>

## FIELDS
Conforme visto acima, o JSON é composto de alguns objetos principais, cada um com suas propriedades.
Descreverei, abaixo, informações gerais sobre cada um desses objetos principais e depois como informar
cada uma de suas propriedades.
- Os objetos principais estão representados abaixo por títulos de nível 3.
- Em algumas situações, dentro de um objeto as variáves são agrupadas por parte. As partes estão representadas por titulos de nível 4.
- As propriedades estão representadas por títulos de nível 5.

### Início_da_Sentença

Este objeto reflete informações constantes nos documentos petição inicial e contestação que foram disponibilizados acima.

###### Lo_APIN - Pedido de Benefício por Incapacidade Permanente
- Indica se a petição inicial contém pedido de benefício por incapacidade permanente (aposentadoria por invalidez).

###### Lo_AC25 - Pedido de Acréscimo de 25%
- Indica se a petição inicial contém pedido de acréscimo de 25% em benefício por incapacidade.

###### Lo_DM - Pedido de Dano Moral
- Indica se a petição inicial contém pedido de indenização por danos morais.

###### Lo_Revel - Revelia
- Se não houver peça de contestação, informe "true", caso o contrário, informe "false".

###### Lo_Interesse - Falta de Interesse de Agir
- Se a contestação alegar falta de interesse de agir, informe "true", caso contrário ou caso não haja contestação, informe "false".

###### Lo_Prescrição - Aplicação de Prescrição
- Indica se a contestação requer aplicação de prescrição, caso não haja contestação, informe "false".

###### Ev_Cessação_Benef - Evento que Comprova a Cessação do Benefício
- Em que evento se comprova a cessação do benefício?

###### Ev_Proposta_Acordo - Evento da Proposta de Acordo
- Caso haja proposta do INSS para acordo, em que evento ela se encontra?

###### Ev_Recusa_Acordo - Evento da Recusa de Acordo
- Caso tenha havido recusa à proposta de acordo, em que evento ela se encontra?

###### Ev_Impug - Evento da Impugnação do Autor ao Laudo Pericial
- Em qual evento se encontra a impugnação do autor ao laudo pericial?

###### Ev_INSS_Impug - Evento da Impugnação do INSS ao Laudo Pericial
- Em qual evento se encontra a impugnação do INSS ao laudo pericial?

###### MsgDeErro - Mensagem de Erro
- Se a extração das variáveis foi bem-sucedida, informe "".
- Caso tenha ocorrido algum problema na extração das informações (como uma ambiguidade relevante ou trechos ininteligíveis que impeçam a correta interpretação das alegações), descreva de forma suscinta e clara o problema enfrentado, indicando a variável e o motivo da impossibilidade.

### Resultado_do_Laudo

Analise cuidadosamente o laudo pericial entre os marcadores <laudo> e </laudo>. Se houver um laudo complementar entre os marcadores <laudo_complementar> e </laudo_complementar>, inclua-o na análise considerando-o como esclarecimento(s), correção(ões) ou complementação do laudo pericial original.

#### PARTE 1
- Na PARTE 1, não se pode em nenhuma hipótese levar em consideração algo que não esteja explicitamente no laudo pericial ou no laudo complementar. Eventual impugnação entre os marcadores <impug> e </impug> não deve influenciar de nenhuma forma as respostas dadas na PARTE 1.

###### Dt_Perícia - Data da Perícia
- Data em que foi realizada a perícia, no formato dd/mm/aaaa.

###### Nr_Idade - Idade do Periciado
- Idade (em anos) do periciado.

###### Patologia - Patologia Conforme Laudo Pericial
- Patologia(s) que constam no laudo pericial como objeto de exame pelo perito. Informe o nome da patologia e, se disponível no laudo, o código CID entre parênteses. Havendo mais de uma patologia examinada, elas devem ser separadas por “;”. Se o laudo afirmar a necessidade de exame de outras patologias por perito de outra especialidade, acrescente uma observação mencionando essa ocorrência e quais as patologias estão pendentes de exame complementar (Ex.: ‘Observação: Perito identificou a necessidade de exame pericial complementar em relação à patologia xxxx’).

###### Lo_Patologia_Lista - Patologia Presente na Lista
- Verifique se a(s) patologia(s) indicada(s) está(ão) presente(s) na seguinte lista de patologias: I - tuberculose ativa; II - hanseníase; III - transtorno mental grave, desde que esteja cursando com alienação mental; IV - neoplasia maligna; V - cegueira; VI - paralisia irreversível e incapacitante; VII - cardiopatia grave; VIII - doença de Parkinson; IX - espondilite anquilosante; X - nefropatia grave; XI - estado avançado da doença de Paget (osteíte deformante); XII - síndrome da deficiência imunológica adquirida (AIDS/SIDA); XIII - contaminação por radiação, com base em conclusão da medicina especializada; XIV - hepatopatia grave; XV - esclerose múltipla; XVI - acidente vascular encefálico (agudo); e XVII - abdome agudo cirúrgico. 
- A comparação deve considerar equivalência semântica, ou seja, mesmo que os nomes não coincidam exatamente, deve-se reconhecer se a patologia indicada corresponde, de forma substancial, a alguma da lista.
- Identificada a presença na lista acima, reponda "true", caso contrário, responda "false".

###### Ev_Laudo - Evento do Laudo Pericial
- Código do evento onde se encontra o laudo.

###### ConclusãoPerícia - Conclusão da Perícia
- Uma das seguinte respostas: ‘Não há incapacidade’, ‘Não há incapacidade atual, mas houve incapacidade pregressa’, ‘Com Incapacidade Temporária’, ‘Com Incapacidade Permanente’.
- Importante: se não há incapacidade’, pule para a <PARTE 2>

###### PeríodoIncapacidadeAnterior - Período de Incapacidade Pregressa
- Responder somente se a variável anterior, "ConclusãoPerícia" foi preenchida com 'Não há incapacidade atual, mas houve incapacidade pregressa’.
- Indicar período da incapacidade pretérita (início e término) no formato: dd/mm/aaaa a dd/mm/aaaa.
- Caso haja mais de 1 período, eles devem ser separados por ";".

**IMPORTANTE**: O restante da PARTE 1 só deve ser avaliado e respondido caso haja incapacidade atual (temporária ou permanente) do periciado. Pule para a <PARTE 2> caso o perito tenha concluído que não existe incapacidade atual. 

###### Lo_Acréscimo25pc - Perito Reconhece a Necessidade do Acréscimo de 25%
- Indica se o perito afirmou que há necessidade de acompanhamento permanente do periciado por outra pessoa.

###### Lo_Reabilitação - Perito Reconhece a Necessidade de Reabilitação Profissional
- Indica se o perito afirmou que há necessidade de reabilitação profissional do periciado.

###### ReabilitaçãoSugerida - Reabilitação Sugerida
- Preencher somente se a variável anterior, "Reabilitação", foi preenchida com "true".
- Indicação do laudo pericial ou laudo complementar quanto às espécies de atividades ou trabalhos nos quais o periciado pode ser reabilitado, ou a indicação das limitações do periciado (impossibilidade de executar certas tarefas, ou trabalhar em certas condições). Responder com um texto sucinto.

###### Dt_DII - Data de Início da Incapacidade
- A data que o perito indicou como início da incapacidade do periciado.
- Mesmo que haja conclusão pela incapacidade permanente, o conteúdo dessa variável se refere à data de início da incapacidade temporária, que não necessariamente coincide com a data de início da incapacidade permanente.

###### Dt_DID - Data de Início da Doença
- A data que o perito indicou como início da doença que levou o periciado à incapacidade.

###### Dt_DII_Perm - Data de Início da Incapacidade Permanente
- Preencher somente se a variávil "ConclusãoPerícia" foi preenchida com "Com Incapacidade Permanente".
- Informar a data que o perito indicou como início da incapacidade permanente do periciado.

###### PatologiaIncapacitante - Patologia Incapacitante
- A(s) patologia(s) indicadas pelo perito como geradora(s) de incapacidade do periciado.
- A resposta deve apresentar o nome da patologia e, caso mencionada no laudo, a CID correspondente entre parênteses.
- Havendo mais de uma patologia incapacitante, elas devem ser separadas por ";".

###### Dt_DCB - Data de Cessação do Benefício
- Preencher somente se a variável "ConclusãoPerícia" foi preenchida com "Com Incapacidade Temporária".
- A data que o perito indicou como possível recuperação da capacidade laborativa pelo periciado, no formato dd/mm/aaaa.
- Caso o perito, ao invés de indicar uma data específica, mencionar um período para recuperação (ex: 4 meses, 1 ano, 18 meses), a resposta para essa variável deve ser a soma desse período com a data informada na variável [DtPerícia]. 

#### PARTE 2

###### BreveResumoDoLaudo - Breve Resumo do Laudo Pericial
- Forneça um resumo objetivo e conciso do laudo pericial e laudo complementar (caso exista), com até 300 palavras. O resumo deve ser neutro, direto e sem interpretações subjetivas.

#### PARTE 3

Na PARTE 3, deve ser feita uma reflexão ponderada sobre eventuais contradições, omissões e obscuridades no laudo pericial.

METODOLOGIA DE ANÁLISE NA PARTE 3: A análise deve ser feita com base nas premissas dispostas adiante, em conjunto com as alegações contidas em eventual impugnação ao laudo pericial. Se houver impugnação ao laudo pericial, ela estará entre os marcadores <impug> e </impug>. Havendo impugnação, a análise deve compreender cada alegação e confirmar se há ou não efetiva contradição, omissão ou obscuridade no laudo pericial, conforme as premissas dispostas a seguir. 

PREMISSAS DE ANÁLISE NA PARTE 3:

I) Opiniões clínicas de médicos assistentes do autor em sentido contrário ao laudo pericial não são consideradas contradições, mas mera discordância em relação ao resultado.

II) São consideradas CONTRADIÇÕES apenas as afirmações internas ao laudo pericial que sejam logicamente incompatíveis. Exemplos de contradições:
II.1) Um trecho do laudo pericial conclui pela ausência de incapacidade e, em outro trecho, é indicada uma data de início da incapacidade.
II.2) A data do início da incapacidade permanente ser anterior à data do início da doença, ou à data da incapacidade temporária.
II.3) São apresentadas datas diferentes para início da incapacidade em trechos distintos do laudo pericial.

III) São consideradas efetivas OMISSÕES do laudo pericial:
III.1) Não se pronunciar sobre alguma patologia que a parte autora alega possuir.
III.2) O laudo pericial concluir pela incapacidade, mas não afirmar quando iniciou a incapacidade.
III.3) O laudo pericial concluir pela incapacidade permanente, mas não afirmar quando a incapacidade se tornou permanente.
III.4) O laudo pericial não apresentar razões consistentes para a conclusão a que chegou.
III.5) O laudo pericial não trazer a lista de documentos que foram analisados.
III.6) O laudo pericial não fazer resumo da história clínica ou anamnese do periciado.

IV) São consideradas efetivas OBSCURIDADES os trechos ininteligíveis ou ambíguos sem possibilidade de interpretação lógica com base na leitura completa do laudo. 

###### ConclusãoDaAnálise - Conclusão da Análise
- Se forem identificadas contradições, omissões ou obscuridades, redija um despacho judicial para converter o processo em diligência. O despacho deverá, de forma clara e objetiva
  - Descrever a falha detectada. A descrição deve apontar, conforme o caso: os trechos que estiverem em contradição, a omissão na análise de certa patologia (ou qual omissão relevante foi detectada), indicar o trecho ininteligível ou ambíguo.
  - Elaborar a(s) pergunta(s) que devem ser respondidas pelo perito para que as deficiências detectadas (contradições, omissões ou obscuridades) sejam sanadas.
  - Concluir com o encaminhamento ao perito para que sejam prestados os esclarecimentos necessários. 
- Caso não sejam detectadas falhas passíveis de conversão em diligência, não preencher.




### Qualidade_de_Segurado_pela_DCB

###### Dt_ÚltimaDCB - Data da Última Cessação do Benefício
- Indicar a última DCB (Data da Cessação do Benefício) no formato dd/mm/yyyy

###### Dt_ÚltimaDER_Indef - DER do Último Benefício Indefido
- Indicar a DER do último benefício indeferido no formato dd/mm/yyyy

###### Fonte_QS - Fonte da Qualidade de Segurado
- Se confirmada a qualidade de segurado, qual a origem?


### Extração_de_Vínculos_do_CNIS

###### Tx_Vínculos - Relatório de Vínculos com base nas informações do CNIS
- Relatório de Vínculos com base nas informações do CNIS
- Contém todos os vínculos ordenados do mais antigo para o mais recente.
- Cada vínculo possui a seguinte estrutura: {Seq} – {QS} – {Espécie_Vínculo} – {Dt_Início} – {Dt_Início_Efetiva} – {Dt_Fim} – {Núm_Contrib} – {Contrib_Sem_Perda_QS} – {P_Graça} – {Dt_Perda_QS} 
- Seq: número sequencial
- QS: pode ser de três tipos: “1º Vínculo”, “Manteve QS” e “Perdeu QS”.
- Espécie_Vínculo: pode ser de três categorias: “Recolhimentos”, “Benefício” e “Outros” (qualquer valor diferente de “Recolhimentos” e “Benefício” deve ser tratado nas regras lógicas como “Outros”)
- Dt_Início: formato dd/mm/aaaa.
- Dt_Início_Efetiva: formato dd/mm/aaaa.
- Dt_Fim: formato dd/mm/aaaa.
- Num_Contrib: número de contribuições do vínculo.
- Contrib_Sem_perda_QS: número de contribuições sem perda da qualidade de segurado que foram acumuladas até o fim vínculo.
- Os campos P_Graça e Dt_Perda_QS não são necessários no processamento.
- Os vínculos são separados por ponto e vírgula “;”.

###### Dt_Primeiro_Recol - Primeira Data de Recolhimento
- Primeira data de pagamento entre os recolhimentos feitos pelo segurado no formato dd/mm/yyyy

###### Dt_Rec_Ant - Última Data de Recolhimento Anterior à DII
- Maior data de pagamento anterior à DII no formato dd/mm/yyyy

###### Dt_Comp_Rec_Ant - Última Competência de Recolhimento Anterior à DII
- Competência com a maior data de pagamento anterior à DII no formato dd/mm/yyyy

###### Lista_Comp_Antes_DII_Recol_Depois - Lista de Competências anteriores à DII com recolhimento posterior à DII
- Lista de Competências anteriores à DII, com recolhimento posterior à DII

###### Dt_1o_Recol_pósDII - Primeira Data de Recolhimento após a DII
- Primeiro recolhimento posterior à DII no formato dd/mm/yyyy

### Qualidade_de_Segurado_pelo_CNIS

###### Ev_CNIS - Evento do CNIS
- Em qual evento se encontra o CNIS no formato numérico

###### Ev_Seg_Desemprego - Evento do Pedido/Deferimento do Seguro Desemprego
- Em qual evento se encontra o pedido/deferimento do seguro desemprego

###### Nr_Contrib_Sem_Perder_QS - Número Máximo de Contribuições sem Perda da Qualidade de Segurado
- Máximo de contribuições sem perda da qualidade de segurado

###### Nr_Total_Contrib - Total de Contribuições
- Total geral de contribuições

###### Dt_Primeiro_Vínculo - Primeira Data de Vínculo com o RGPS
- Data do primeiro vínculo com o RGPS no formato dd/mm/yyyy

###### Ma_Comp_DII - Competência da DII
- Competência da DII (Data do início da Incapacidade) no formato mm/yyyy

###### Ma_Últ_Comp_Ant_Incapac - Última Competência antes da Incapacidade
- Última competência recolhida pelo segurado antes da Incapacidade no formato mm/yyyy

###### Dt_Recol_Ant_Incapac - Última Data de Recolhimento antes da Incapacidade
- Última data de recolhimento pelo segurado antes da Incapacidade no formato dd/mm/yyyy

###### Dt_Ini_Último_Emprego - Data de Início do Último Emprego
- Início do último vínculo de emprego ou benefício antes da Incapacidade no formato dd/mm/yyyy

###### Dt_Fim_Último_Emprego - Data de Fim do Último Emprego
- Fim do último vínculo de emprego ou benefício antes da Incapacidade no formato dd/mm/yyyy

###### Ma_Últ_Comp_Contrib_Ant - Última Competência de Contribuição antes da Incapacidade
- Última competência de contribuição antes da Incapacidade no formato dd/mm/yyyy

###### Espécie_Antes_DII - Espécie do vínculo antes da Incapacidade
- Espécie do vínculo antes da Incapacidade

### Carência

###### Dt_Perda_QS - Data da Perda da Qualidade de Segurado
- Dia em que houve a Perda da Qualidade de Segurado no formato dd/mm/yyyy

###### Dt_Recupera_QS - Data da Recuperação da Qualidade de Segurado
- Dia em que recuperou a Qualidade de Segurado no formato dd/mm/yyyy

###### Nr_Contrib_Antes_DII - Número de Contribuições antes da DII
- Número de contribuições entre a perda da qualidade de segurado e a DII no formato numérico

###### Dt_Recupera_QS_Antes_DII - Data da Recuperação da Qualidade de Segurado
- Se algum vínculo possui QS = “Perdeu QS”: Dt_Início_Efetiva do último vínculo que possuir QS = “Perdeu QS”
- Caso contrário: Dt_Primeiro_Vínculo

###### Nr_Comp_Antes_DII_Recol_Depois - Número de Competências Antes da DII com Recolhimento Rosterior à DII
- Se Lista_Comp_Antes_DII_Recol_Depois !== "não há": quantidade de competências (formato mm/aaaa) que existirem na Lista_Comp_Antes_DII_Recol_Depois
- Caso contrário: 0

###### Lo_Filiação_Oportunista - Filiação Oportunista
- Houve filiação oportunista em caso de DID desconhecida (mas provavelmente anterior ao primeiro recolhimento após recuperar a qualidade de segurado)? 

### Resposta_à_Impugnação_do_INSS_ao_Laudo

###### Resposta - Resposta à Impugnação do INSS ao Laudo

### Fechamento_da_Sentença

###### Lo_Possui_Carência - Cumpriu Carência Necessária
A parte autora cumpriu a carência necessária? 

###### Dt_DER - Data da Entrada do Requerimento
Informar a DER (Data da Entrada do Requerimento) no formato dd/mm/yyyy

###### Dt_DIB - Data do Início do Benefício
- Informar a DIB (Data do Início do Benefício) no formato dd/mm/yyyy

###### Concede_Restabelece - Concede ou Restabelece
- O caso é de concessão ou restabelecimento? Informar "Concede" ou "Restabelece".

###### Dt_DCB_90dias_hoje - Data da Cessação do Benefício Caso no Laudo Seja nos Próximos 90 Dias
- Informar a DCB efetiva, caso a DCB no laudo seja nos próximos 90 dias, no formato dd/mm/yyyy

###### Dt_DCB_6meses_hoje - Data de Cessação do Benefício Caso Seja Necessária Reabilitação Profissional
- Informar a DCB, caso seja necessária reabilitação profissional, no formato dd/mm/yyyy

###### Dt_AC25 - Data do Acréscimo de 25%
-  Em caso de necessidade do acréscimo, informar a data a partir da qual deve ser pago o acrécimo, no formato dd/mm/yyyy


# FORMAT

Trata-se de ação previdenciária, por meio da qual a parte autora pretende a condenação do INSS a conceder o benefício de auxílio por incapacidade temporária{% if Lo_APIN %}, bem como sua conversão em aposentadoria por incapacidade permanente{% endif %}{% if Lo_AC25 %} e acréscimo de 25% referente ao auxílio permanente de terceiros{% endif %}. {% if Lo_DM %}Requer, ainda, condenação em danos morais.{% endif %}

{% if Lo_Revel %}
Considerando a ausência de contestação, decreto a revelia do INSS, afastando os seus efeitos materiais tendo em vista tratar-se de direito indisponível, nos termos do art. 345, II, do CPC/15.
{% endif %}

{% if Lo_Interesse %}
Afasto a preliminar de falta de interesse de agir diante da comprovação de cessação do benefício (evento {{Ev_Cessação_Benef}}), não sendo exigido o exaurimento das vias administrativas para postular em juízo. 
{% endif %}

{% if Lo_Prescrição %}
Rejeito a alegação de prescrição quinquenal, pois, apesar da previsão legal no art. 103, parágrafo único, da Lei 8.213/91, não há, nos presentes autos, requerimento que ultrapasse o período de 5 anos contados da propositura da inicial. 
{% endif %}

{% if Ev_Proposta_Acordo and Ev_Recusa_Acordo %}
O INSS juntou aos autos uma proposta de acordo (evento {{Ev_Proposta_Acordo}}), no entanto a parte autora expressamente a recusou (evento {{Ev_Recusa_Acordo}}). Deste modo, passo à análise do mérito.
{% endif %}

{% if Ev_Proposta_Acordo and not Ev_Recusa_Acordo %}
O INSS juntou aos autos uma proposta de acordo (evento {{Ev_Proposta_Acordo}}) e o juízo intimou a parte autora para manifestação. Ocorre que ela se manteve silente, apesar da tentativa de conciliação. Tratando-se de benefício por incapacidade e considerando a necessidade de solução rápida para tais casos, tenho que seria inviável proceder sucessivas intimações buscando manifestação expressa. Deste modo, passo à análise do mérito.
{% endif %}

Para o recebimento de auxílio por incapacidade temporária, mister se faz que a parte demandante atenda aos requisitos legais ditados pelo art. 59 da Lei nº 8.213/91, quais sejam: ostentar a qualidade de segurado, atender o prazo de carência fixado em lei e constatação de incapacidade para o seu trabalho ou para a sua atividade habitual por mais de 15 dias consecutivos. Já em relação à aposentadoria por incapacidade permanente é necessário, além do preenchimento dos dois primeiros requisitos acima descritos, que haja incapacidade insuscetível de reabilitação para o exercício de atividade que garanta subsistência, nos termos do art. 42 da Lei nº 8.213/91. 

{% if not Lo_Reabilitação and ConclusãoPerícia === 'Com Incapacidade Temporária' %}
A perícia judicial realizada em {{Dt_Perícia}} atestou que a parte autora encontra-se acometida de moléstia que a incapacita para o exercício de sua atividade laborativa habitual. Pelas conclusões médicas constantes no laudo de evento {{Ev_Laudo}}, a situação fática vivida pela parte autora atende ao requisito legal de incapacidade para a concessão do auxílio por incapacidade temporária e, por não haver provas suficientemente robustas em sentido contrário, acolho e fundamento a existência de incapacidade nos termos do laudo pericial, o qual utilizo como razões de decidir.
{% endif %}

{% if ConclusãoPerícia === 'Não há incapacidade atual, mas houve incapacidade pregressa' %}
A perícia judicial realizada em {{Dt_Perícia}} atestou que a parte autora encontra-se atualmente apta ao exercício de suas atividades laborais, não obstante ter havido períodos de incapacidade pregressa: {{PeríodoIncapacidadeAnterior}}.

Pelas conclusões médicas constantes no laudo de evento {{Ev_Laudo}}, a situação fática vivida pela parte autora não atende ao requisito legal de incapacidade para a concessão do benefício pretendido no presente momento, apesar de sua incapacidade pretérita dever ser considerada para fins de aferição do direito ao benefício temporário no passado. 

Por não haver provas suficientemente robustas em sentido contrário, acolho e fundamento a existência de incapacidade nos termos do laudo pericial, o qual utilizo como razões de decidir.
{% endif %}

{% if Lo_Reabilitacao and ConclusãoPerícia === 'Com Incapacidade Temporária' %}
A perícia judicial realizada em {{Dt_Perícia}} atestou que a parte autora encontra-se acometida de moléstia que a incapacita para o exercício de atividades laborais próprias da sua categoria profissional de forma permanente, havendo aptidão, no entanto, para o desempenho de outras atividades após processo de reabilitação profissional.

Pelas conclusões médicas constantes no laudo de evento {{Ev_Laudo}}, a situação fática vivida pela parte autora atende ao requisito legal de incapacidade para a concessão do auxílio por incapacidade temporária e, por não haver provas suficientemente robustas em sentido contrário, acolho e fundamento a existência de incapacidade nos termos do laudo pericial, o qual utilizo como razões de decidir.
{% endif %}

{% if ConclusãoPerícia === 'Com Incapacidade Permanente' %}
A perícia judicial realizada em {{Dt_Perícia}} atestou que a parte autora encontra-se acometida de moléstia que a incapacita para toda e qualquer atividade laborativa, configurando-se, no caso, incapacidade total e permanente.

Pelas conclusões médicas constantes no laudo de evento {{Ev_Laudo}}, a situação fática vivida pela parte autora atende ao requisito legal de incapacidade para a concessão de aposentadoria e, por não haver provas suficientemente robustas em sentido contrário, acolho e fundamento a existência de incapacidade nos termos do laudo pericial, o qual utilizo como razões de decidir.
{% endif %}

{% if ConclusãoPerícia === 'Com Incapacidade Permanente' and not Lo_APIN %}
Embora tenha sido requerido somente o benefício de auxílio por incapacidade temporária, também restou comprovado o preenchimento dos requisitos legais exigidos para a concessão do benefício de aposentadoria por incapacidade permanente, previstos no art. 42 da Lei nº 8.213/91, tendo em vista que o laudo pericial concluiu pela incapacidade plena e permanente da parte autora para exercer quaisquer atividades laborais.

Entendo que os princípios que regem os Juizados Especiais – simplicidade, informalidade, economia processual e celeridade (art. 2º da Lei nº 9.099/95 c/c art. 1º da Lei nº 10.259/01) – devem prevalecer, no caso concreto, sobre o princípio da correlação ou congruência previsto no CPC. Em casos análogos, o Eg. STJ posicionou-se no sentido de aplicar o princípio da fungibilidade quando se trata da concessão de benefício previdenciário, o que também vem sendo adotado por boa parte da jurisprudência nos diversos Tribunais. 

Destarte, em observância aos princípios norteadores dos Juizados Especiais e diante da constatação, pela análise pericial, da incapacidade laboral da parte autora em caráter permanente, ou seja, a impossibilidade de retornar às suas atividades habituais, bem como ter sucesso em eventual reabilitação profissional, é cabível a procedência do pedido para determinar, além da concessão do benefício de auxílio por incapacidade temporária, sua conversão em aposentadoria por incapacidade permanente.
{% endif %}

{% if date(Dt_DII) <= date(Dt_ÚltimaDCB) %}
A qualidade de segurado perante a Previdência Social presume-se, já que o benefício foi cessado em razão da capacidade para o trabalho e não por ausência de vínculo com o RGPS (evento {{Ev_Cessação_Benef}}). 

Ademais, em se tratando de restabelecimento, deve-se considerar que o próprio INSS reconheceu a qualidade de segurado e o cumprimento da carência quando da concessão, donde se conclui que a cessação do benefício na esfera administrativa restringiu-se à hipótese de não mais haver incapacidade para o trabalho.
{% endif %}

{% if date(Dt_DII) <= dateAddMonths(Dt_ÚltimaDCB, 12) %}
A qualidade de segurado perante a Previdência Social presume-se, já que o benefício foi indeferido em razão da capacidade para o trabalho e não por ausência de vínculo com o RGPS (evento {{Ev_Cessação_Benef}}). 

Ademais, constam nos autos elementos que comprovam de forma substancial a manutenção desta condição perante o Regime Geral de Previdência Social, uma vez que a parte autora estava em gozo de benefício por incapacidade até {{Dt_ÚltimaDCB}}, devendo-se considerar que o próprio INSS reconheceu a qualidade de segurado e o cumprimento da carência quando da concessão. 

Tendo em vista que o laudo pericial fixa o início da incapacidade em {{Dt_DII}}, não foi ultrapassado o período de graça desde a cessação do último benefício, de modo que se tem por preenchidos os requisitos da qualidade de segurado e carência.
{% endif %}

Noutra perspectiva, para aferição da qualidade de segurado no momento da incapacidade, colaciona-se uma breve síntese das informações constantes no CNIS da parte autora:

{{Tx_Vinculos}}

{% if Nr_Contrib_Antes_DII >= 12 %}
Observa-se, ainda, mais de 12 contribuições ao RGPS em período anterior à manifestação da incapacidade, sem que tenha ocorrido perda da qualidade de segurado. Deste modo, conclui-se que o requisito da carência também foi cumprido.
{% endif %}

{% if Nr_Total_Contrib >= 12 and Nr_Contrib_Antes_DII >= 6 %}
Observa-se, ainda, mais de 12 contribuições ao RGPS no total, sendo {{Nr_Contrib_Antes_DII}} delas em período anterior à manifestação da incapacidade. Deste modo, conclui-se que o requisito da carência também foi cumprido.

Ainda no que se refere à carência, saliento que a incapacidade é posterior a 06/01/2017 (edição da MP 767/2017, convertida na Lei 13.457/17), de modo que se aplica ao caso o art. 27-A da Lei 8.213/91, na redação dada pela Lei 13.846/19, que prevê a recuperação das contribuições anteriores para efeito de carência ao se completar metade das contribuições necessárias (ao menos 6 contribuições).
{% endif %}

{% if Lo_Patologia_Lista and date(Dt_DID) >= date(Dt_Recupera_QS_Antes_DII) %}
Quanto ao requisito da carência, não constam dos autos ao menos 12 contribuições ao RGPS em momento anterior à data da incapacidade identificada na perícia. Todavia, considerando a natureza da patologia e o fato desta ter surgido após o ingresso no sistema, aplica-se, ao caso, o art. 26, inciso II, combinado com o art. 151 da Lei 8.213/91, que classifica as doenças isentas de carência.

> “Art. 151.  Até que seja elaborada a lista de doenças mencionada no inciso II do art. 26, independe de carência a concessão de auxílio-doença e de aposentadoria por invalidez ao segurado que, após filiar-se ao RGPS, for acometido das seguintes doenças: tuberculose ativa, hanseníase, alienação mental, esclerose múltipla, hepatopatia grave, neoplasia maligna, cegueira, paralisia irreversível e incapacitante, cardiopatia grave, doença de Parkinson, espondiloartrose anquilosante, nefropatia grave, estado avançado da doença de Paget (osteíte deformante), síndrome da deficiência imunológica adquirida (aids) ou contaminação por radiação, com base em conclusão da medicina especializada.” 

A lista acima foi ampliada pela portaria MTP/MS 22 de 31/08/2022, englobando, atualmente: I - tuberculose ativa; II - hanseníase; III - transtorno mental grave, desde que esteja cursando com alienação mental; IV - neoplasia maligna; V - cegueira; VI - paralisia irreversível e incapacitante; VII - cardiopatia grave; VIII - doença de Parkinson; IX - espondilite anquilosante; X - nefropatia grave; XI - estado avançado da doença de Paget (osteíte deformante); XII - síndrome da deficiência imunológica adquirida (AIDS/SIDA); XIII - contaminação por radiação, com base em conclusão da medicina especializada; XIV - hepatopatia grave; XV - esclerose múltipla; XVI - acidente vascular encefálico (agudo); e XVII - abdome agudo cirúrgico.

Nesse sentido, havendo isenção de carência no caso concreto, há que se reconhecer o cumprimento de mais esse requisito.
{% endif %}

{% if not Lo_Patologia_Lista and Nr_Contrib_Antes_DII < 12 and Nr_Comp_Antes_DII_Recol_Depois == 0 %}
Quanto ao requisito da carência, constam {{Nr_Contrib_Antes_DII}} recolhimentos anteriores ao início da incapacidade. Com menos de 12 contribuições ao RGPS, não se atende um dos requisitos legais, devendo ser julgada improcedente a demanda.
{% endif %}

{% if not Lo_Patologia_Lista and Nr_Contrib_Antes_DII < 12 and Nr_Comp_Antes_DII_Recol_Depois !== 0 %}
Quanto ao requisito da carência, constam {{Nr_Contrib_Antes_DII}} recolhimentos anteriores ao início da incapacidade. Com menos de 12 contribuições ao RGPS, não se atende um dos requisitos legais, devendo ser julgada improcedente a demanda.

Importa destacar que as competências {{Lista_Comp_Antes_DII_Recol_Depois}}, apesar de se referirem a meses anteriores à constatação da incapacidade, foram recolhidas em momento posterior à DII. 

Recolhimentos em atraso realizados em momento no qual a parte já estava incapacitada para o trabalho não podem ser considerados para efeito de concessão do benefício pretendido, sob pena de subverter a lógica do seguro social e à própria lei, sobretudo à regra contida no art. 27, inciso II, da Lei 8.213/91.
{% endif %}

{% if not Lo_Patologia_Lista and Nr_Total_Contrib >= 12 and Nr_Comp_Antes_DII_Recol_Depois == 0 and Nr_Contrib_Antes_DII < 6 %}
Quanto ao requisito da carência, inobstante constarem, no total, mais de 12 contribuições ao RGPS, não houve o recolhimento de ao menos 6 delas após a perda da qualidade de segurado, ocorrida em {{Dt__Perda_QS}}. Contam-se, no caso, {{Nr_Contrib_Antes_DII}} recolhimentos após a recuperação da qualidade de segurado ocorrida em {{Dt_Recupera_QS_Antes_DII}}. Afasta-se, portanto, a benesse prevista no art. 27-A da Lei 8.213/91, na redação da Lei 13.846/19.
{% endif %}

{% if not Lo_Patologia_Lista and Nr_Total_Contrib >= 12 and Nr_Comp_Antes_DII_Recol_Depois !== 0 and Nr_Contrib_Antes_DII < 6 %}
Quanto ao requisito da carência, inobstante constarem, no total, mais de 12 contribuições ao RGPS, não houve o recolhimento de ao menos 6 delas após a perda da qualidade de segurado, ocorrida em {{Dt_Perda_QS}}. Contam-se, no caso, {{Nr_Contrib_Antes_DII}} recolhimentos após a recuperação da qualidade de segurado ocorrida em {{Dt_Recupera_QS_Antes_DII}}. Afasta-se, portanto, a benesse prevista no art. 27-A da Lei 8.213/91, na redação da Lei 13.846/19.

Importa destacar que as competências {{Lista_Comp_Antes_DII_Recol_Depois}}, apesar de se referirem a meses anteriores à constatação da incapacidade, foram recolhidas em momento posterior à DII. 

Recolhimentos em atraso realizados em momento no qual a parte já estava incapacitada para o trabalho não podem ser considerados para efeito de concessão do benefício pretendido, sob pena de subverter a lógica do seguro social e à própria lei, sobretudo à regra contida no art. 27, inciso II, da Lei 8.213/91.
{% endif %}

{% if Lo_Patologia_Lista and date(Dt_DID) < date(Dt_Recupera_QS_Antes_DII) %}
A moléstia que acomete a parte autora encontra-se no rol do art. 151 da Lei 8.213/91, que remete à isenção de carência:

> “Art. 151.  Até que seja elaborada a lista de doenças mencionada no inciso II do art. 26, independe de carência a concessão de auxílio-doença e de aposentadoria por invalidez ao segurado que, após filiar-se ao RGPS, for acometido das seguintes doenças: tuberculose ativa, hanseníase, alienação mental, esclerose múltipla, hepatopatia grave, neoplasia maligna, cegueira, paralisia irreversível e incapacitante, cardiopatia grave, doença de Parkinson, espondiloartrose anquilosante, nefropatia grave, estado avançado da doença de Paget (osteíte deformante), síndrome da deficiência imunológica adquirida (aids) ou contaminação por radiação, com base em conclusão da medicina especializada.”

Cumpre destacar, ainda, que a lista acima foi ampliada pela portaria MTP/MS 22 de 31/08/2022, englobando, atualmente: I - tuberculose ativa; II - hanseníase; III - transtorno mental grave, desde que esteja cursando com alienação mental; IV - neoplasia maligna; V - cegueira; VI - paralisia irreversível e incapacitante; VII - cardiopatia grave; VIII - doença de Parkinson; IX - espondilite anquilosante; X - nefropatia grave; XI - estado avançado da doença de Paget (osteíte deformante); XII - síndrome da deficiência imunológica adquirida (AIDS/SIDA); XIII - contaminação por radiação, com base em conclusão da medicina especializada; XIV - hepatopatia grave; XV - esclerose múltipla; XVI - acidente vascular encefálico (agudo); e XVII - abdome agudo cirúrgico.

Ocorre que, como se depreende da leitura do dispositivo legal, somente se confere isenção de carência quando a enfermidade surge em momento posterior ao ingresso / reingresso no RGPS. Explico melhor!

Apesar do § 1º do art. 59 da Lei nº 8.213/91 permitir o deferimento de benefício por incapacidade temporária ao segurado que se filiou com alguma patologia, sem estar incapacitado, e tornou-se incapaz tempos depois, por agravamento, não há que se falar (nesse caso) de dispensa de carência, conforme redação do art. 26, inciso II, da Lei 8.213/91:

> “Art. 26. Independe de carência a concessão das seguintes prestações: (...)
II - auxílio-doença e aposentadoria por invalidez nos casos de acidente de qualquer natureza ou causa e de doença profissional ou do trabalho, bem como nos casos de segurado que, após filiar-se ao RGPS, for acometido de alguma das doenças e afecções especificadas em lista elaborada pelos Ministérios da Saúde e da Previdência Social, atualizada a cada 3 (três) anos, de acordo com os critérios de estigma, deformação, mutilação, deficiência ou outro fator que lhe confira especificidade e gravidade que mereçam tratamento particularizado;”              

No caso dos autos, ainda que a incapacidade possa eventualmente ter sido detectada em data posterior ao (re)início das contribuições (Data do Início da Incapacidade em {{Dt_DII}} com recolhimentos feitos de {{Dt_Recupera_QS_Antes_DII}} em diante), conforme consta do laudo pericial, a data do início da doença (DID) foi em {{Dt_DID}}. Havendo início da doença em momento anterior ao início das contribuições, exige-se o cumprimento da carência, conforme acima fundamentado.

Deste modo, ainda que a incapacidade não seja preexistente ao (re)início das contribuições, na data da incapacidade estabelecida pela perícia, a parte autora não tinha cumprido a carência mínima de 12 meses, ou até mesmo os 6 meses exigidos pela lei nas situações de reingresso (art. 27-A da Lei 8.213/91, na redação da Lei 13.846/19).

Embora este Juízo tenha consciência das dificuldades enfrentadas pela parte autora, em razão da doença que lhe acometeu, não há como, a pretexto de querer ajudá-la, conceder-lhe benefício de natureza eminentemente previdenciária. Os benefícios previdenciários são deferidos com base em regras de proteção, tanto do segurado, como do sistema, uma vez que se trata de seguro, ainda que de caráter social. 

Destarte, não atendido um dos requisitos legais, há de ser julgada improcedente a demanda.
{% endif %}

{% if Lo_Filiação_Oportunista %}
A moléstia que acomete a parte autora encontra-se no rol do art. 151 da Lei 8.213/91, que remete à isenção de carência:

> “Art. 151.  Até que seja elaborada a lista de doenças mencionada no inciso II do art. 26, independe de carência a concessão de auxílio-doença e de aposentadoria por invalidez ao segurado que, após filiar-se ao RGPS, for acometido das seguintes doenças: tuberculose ativa, hanseníase, alienação mental, esclerose múltipla, hepatopatia grave, neoplasia maligna, cegueira, paralisia irreversível e incapacitante, cardiopatia grave, doença de Parkinson, espondiloartrose anquilosante, nefropatia grave, estado avançado da doença de Paget (osteíte deformante), síndrome da deficiência imunológica adquirida (aids) ou contaminação por radiação, com base em conclusão da medicina especializada.”

Cumpre destacar, ainda, que a lista acima foi ampliada pela portaria MTP/MS 22 de 31/08/2022, englobando, atualmente: I - tuberculose ativa; II - hanseníase; III - transtorno mental grave, desde que esteja cursando com alienação mental; IV - neoplasia maligna; V - cegueira; VI - paralisia irreversível e incapacitante; VII - cardiopatia grave; VIII - doença de Parkinson; IX - espondilite anquilosante; X - nefropatia grave; XI - estado avançado da doença de Paget (osteíte deformante); XII - síndrome da deficiência imunológica adquirida (AIDS/SIDA); XIII - contaminação por radiação, com base em conclusão da medicina especializada; XIV - hepatopatia grave; XV - esclerose múltipla; XVI - acidente vascular encefálico (agudo); e XVII - abdome agudo cirúrgico.

Ocorre que, como se depreende da leitura do dispositivo legal, somente se confere isenção de carência quando a enfermidade surge em momento posterior ao ingresso / reingresso no RGPS. Explico melhor!

Apesar do § 1º do art. 59 da Lei nº 8.213/91 permitir o deferimento de benefício por incapacidade temporária ao segurado que se filiou com alguma patologia, sem estar incapacitado, e tornou-se incapaz tempos depois, por agravamento, não há que se falar (nesse caso) de dispensa de carência, conforme redação do art. 26, inciso II, da Lei 8.213/91:

> “Art. 26. Independe de carência a concessão das seguintes prestações: (...)
II - auxílio-doença e aposentadoria por invalidez nos casos de acidente de qualquer natureza ou causa e de doença profissional ou do trabalho, bem como nos casos de segurado que, após filiar-se ao RGPS, for acometido de alguma das doenças e afecções especificadas em lista elaborada pelos Ministérios da Saúde e da Previdência Social, atualizada a cada 3 (três) anos, de acordo com os critérios de estigma, deformação, mutilação, deficiência ou outro fator que lhe confira especificidade e gravidade que mereçam tratamento particularizado;”                 

No caso dos autos, ainda que a incapacidade possa eventualmente ter sido detectada em data posterior ao (re)início das contribuições (Data do Início da Incapacidade em {{Dt_DII}} com recolhimentos feitos de {{Dt_Recupera_QS_Antes_DII}} em diante), a doença certamente estava presente em momento anterior, em razão da sua própria natureza e conforme verificado pela lista de eventos clínicos e contributivos. Havendo início da doença em momento anterior ao início das contribuições, exige-se o cumprimento da carência, conforme acima fundamentado.

Deste modo, ainda que a incapacidade não seja preexistente ao (re)início das contribuições, na data da incapacidade estabelecida pela perícia, a parte autora não tinha cumprido a carência mínima de 12 meses, ou até mesmo os 6 meses exigidos pela lei nas situações de reingresso (art. 27-A da Lei 8.213/91, na redação da Lei 13.846/19).

Embora este Juízo tenha consciência das dificuldades enfrentadas pela parte autora, em razão da doença que lhe acometeu, não há como, a pretexto de querer ajudá-la, conceder-lhe benefício de natureza eminentemente previdenciária. Os benefícios previdenciários são deferidos com base em regras de proteção, tanto do segurado, como do sistema, uma vez que se trata de seguro, ainda que de caráter social. 

Destarte, não atendido um dos requisitos legais, há de ser julgada improcedente a demanda.
{% endif %}