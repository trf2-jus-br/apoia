## OBJETIVO: Gerar um relatório para sentença com base nas informações que constam entre os marcadores <controversia_aposentadoria> e </controversia_aposentadoria>.

## ESTRUTURAÇÃO DAS INFORMAÇÕES DE ENTRADA 
As informações que constam entre os marcadores <controversia_aposentadoria> e </controversia_aposentadoria> estão estruturadas em pontos controvertidos, sendo cada ponto controvertido identificado pelos marcadores: <PC id=“01”> ... < PC id=“02”> ... < PC id=“03”>... etc. Cada bloco representa um ponto controvertido e possui um dos seguintes formatos:

# FORMATO 1 (períodos):
<[PC id=“nn”]>
Período: [dd/mm/aaaa] a [dd/mm/aaaa]
Vínculo: [Nome da Empresa | Contribuinte individual | Facultativo | Doméstico | Outro]
Atividade Especial: [sim | não]
Profissão: [profissão]
Código: [código e número do Decreto]
Agentes Nocivos: [agente(s)]
Resumo: <síntese das alegações da inicial e, se houver, controvérsia exposta na contestação e outras manifestações (favoráveis ou desfavoráveis) em peças subsequentes>
</[PC id=“nn”]>
Observação: Pode haver eventualmente supressão de 

#FORMATO 2 (teses gerais):
<[PC id=“nn”]>
Tipo: <Preliminar | Prejudicial de Mérito | Mérito>
Alegação: <Título curto da tese> 
Resumo: <síntese das teses gerais do réu (inespecíficas em relação aos períodos) e, se houver, manifestações em peças subsequentes>
</[PC id=“nn”]>

Observação: Eventualmente pode haver algum campo sem informação, o que deve ser entendido como inexistente nas peças processuais.

## ESTRUTURA DA SAÍDA (TEXTO CORRIDO):

1) Abertura obrigatória: o relatório deve começar com o seguinte parágrafo: “A presente ação tem como objeto a concessão de aposentadoria”. Se nas informações estruturadas houver algum período com “Atividade Especial: sim”, complemente: “, com reconhecimento de tempo laborado em condições especiais.”. Ajuste a pontuação.

2) Pedidos da inicial (apenas períodos, sem detalhes):
Frase modelo se houver algum período com “Atividade Especial: sim”:
“A parte autora requer o reconhecimento dos períodos [lista de períodos com Atividade Especial: sim] como trabalhados em atividade especial.” 
Frase modelo se houver algum período com “Atividade Especial: não”
Além disso, entende que devem ser reconhecidos, em contagem simples, os períodos de [lista de períodos com Atividade Especial: não].” – Troque o “Além disso,” por “A parte autora” caso não haja nenhum período com “Atividade Especial: sim”.

Agrupe todo o conteúdo dos itens 1 e 2 num único parágrafo e ajuste singular ou plural.

3) Teses gerais do réu (FORMATO 2):
Ordem: Preliminares → Prejudiciais de Mérito → Mérito.
Comece com: “Em preliminar de contestação, o INSS...”. 
Se não houver preliminar, comece com: “Em contestação, o INSS pleiteia o reconhecimento da prescrição quinquenal...”. 
Se não houver nem preliminar nem prejudicial de mérito, comece com: “Não houve arguição de preliminares pelo INSS. No mérito, a autarquia...”
Considere o que consta no Resumo para dar clareza do que é alegado em cada tese geral.

4) Controvérsias dos períodos especiais (FORMATO 1 com Atividade Especial: sim): Comece com: “Quanto ao reconhecimento dos períodos em atividade especial, verificam-se as seguintes alegações:”
Seguindo-se com um parágrafo por período, em ordem cronológica, nesta forma:
“Período [dd/mm/aaaa] a [dd/mm/aaaa] — [Vínculo] ([profissão] | [agente(s)]): [expor a controvérsia conforme o Resumo do bloco].”
Entre parênteses, use o(s) agente(s) nocivo(s) ou profissão, conforme a informação que consta em cada bloco. Se ambos existirem, use “(profissão: [profissão]; agentes nocivos: [agente(s)])”. Se nenhum existir, omita os parênteses.
Se houver um único período alegado como especial, emende a frase inicial e o período num único parágrafo, de forma a que se tenha fluidez redacional, ajustando-se singular e plural. Se não houver nenhum período com “Atividade Especial: sim”, pule diretamente para o próximo item.

5) Controvérsias dos períodos simples (FORMATO 1 com Atividade Especial: não):
Se houver algum período com “Atividade Especial: não”, elabore uma breve introdução que dê a entender que passaremos a tratar dos períodos simples (em que não houve pedido de reconhecimento da especialidade). Se não houver nenhum período com “Atividade Especial: não”, pule para o item 6.
Após a breve introdução, devem ser elencados o(s) período(s) com controvérsia ou alegação mencionada no Resumo, sendo um parágrafo por período, ordenado em ordem cronológica:
“Período [dd/mm/aaaa] a [dd/mm/aaaa] — [Vínculo]: [controvérsia segundo Resumo].”
Por fim, agrupe os períodos sem controvérsia específica:
“Além disso, a parte autora também requer o reconhecimento dos seguintes períodos: [lista dos períodos remanescentes, separados por ponto e vírgula e em ordem cronológica].”
Ajuste singular ou plural, se for o caso.

6) Termine com: “É o relatório. Decido.”

IMPORTANTE: Todo o relatório deve ser gerado a partir das informações que estão nas informações estruturadas. O objetivo é colocar as informações estruturadas (entrada) num formato de relatório de sentença com linguagem fluída (saída). Não infira dados ausentes, não utilizar fontes externas e não complete lacunas com conhecimentos gerais. 
