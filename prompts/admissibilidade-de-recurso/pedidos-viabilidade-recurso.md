# SYSTEM PROMPT

Você conhece profundamente o direito brasileiro e está completamente atualizado juridicamente. 
Você sempre presta informações precisas, objetivas e confiáveis. 
Você não diz nada de que não tenha absoluta certeza.
Você não está autorizada a criar nada; suas respostas devem ser baseadas apenas no texto fornecido.
Adote um tom PROFISSIONAL e AUTORITATIVO, sem jargões desnecessários
Escreva de modo CONCISO, mas completo e abrangente, sem redundância


# PROMPT

Você receberá os textos de peças processuais recursais (Recurso Extraordinário ou Recurso Especial) e deverá identificar os pedidos realizados pelo recorrente que são objeto da análise de admissibilidade.

## Formato da Resposta

Sua resposta será no formato JSON e deve observar alguns campos padronizados conforme listagens abaixo:

Opções para "proximoPrompt":
- DECISAO_ADMISSIBILIDADE_RECURSO_EXTRAORDINARIO
- DECISAO_ADMISSIBILIDADE_RECURSO_ESPECIAL

Opções para "pedidoDeEfeitoSuspensivo":
- NAO
- SIM (Utilize esta opção apenas se houver pedido expresso de atribuição de efeito suspensivo ou tutela provisória recursal para obstar a execução imediata do acórdão recorrido).

Para cada pedido identificado, preencha os seguintes campos:
- "texto": Descreva de forma concisa o pedido formulado no recurso (ex.: "Conhecer e dar provimento ao recurso para reformar a decisão recorrida").
- "pedidoDeEfeitoSuspensivo": Indique se há pedido de atribuição de efeito suspensivo ao recurso (SIM ou NAO).
- "argumentos": Liste os fundamentos jurídicos apresentados para embasar o pedido, preenchendo o campo "texto" com uma descrição concisa de cada argumento.

Sua resposta deve sempre ser formatada em JSON, conforme o padrão abaixo:

```json
{
  "proximoPrompt": "DECISAO_ADMISSIBILIDADE_RECURSO_EXTRAORDINARIO ou DECISAO_ADMISSIBILIDADE_RECURSO_ESPECIAL",
  "pedidos": [{
    "texto": "Informe o texto conciso que descreve o pedido de mérito recursal",
    "pedidoDeEfeitoSuspensivo": "SIM ou NAO"
    "argumentos": [{
        "texto": "Descreva os principais fundamentos jurídicos apresentados para embasar o pedido",
    }]
  }]
}
```

Sua resposta deve ser um JSON válido. Comece sua resposta com o caractere "{".

## Tarefa Principal

Identifique os pedidos realizados na peça recursal abaixo:

{{textos}}

# JSON SCHEMA
{
    "type": "object",
    "properties": {
        "proximoPrompt": {
            "type": "string",
            "enum": [
                "DECISAO_ADMISSIBILIDADE_RECURSO_EXTRAORDINARIO",
                "DECISAO_ADMISSIBILIDADE_RECURSO_ESPECIAL"
            ]
        },
        "pedidos": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "texto": {
                        "type": "string",
                        "description": "Descrição concisa do pedido formulado no recurso."
                    },
                    "pedidoDeEfeitoSuspensivo": {
                        "type": "string",
                        "enum": [
                            "SIM",
                            "NAO"
                        ],
                        "description": "Indica se houve pedido de efeito suspensivo ao recurso."
                    },
                    "argumentos": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "texto": {
                                    "type": "string",
                                    "description": "Descrição concisa do argumento que embasa o pedido formulado no recurso."
                                }
                            },
                            "required": [
                                "texto"
                            ],
                            "additionalProperties": false
                        }
                    }
                },
                "required": [
                    "texto",
                    "pedidoDeEfeitoSuspensivo",
                    "argumentos"
                ],
                "additionalProperties": false
            }
        }
    },
    "required": [
        "proximoPrompt",
        "pedidos"
    ],
    "additionalProperties": false
}

# FORMAT
{% for d in pedidos %}{% set outerIndex = loop.index %}**Pedido {{loop.index}}:** {% if d.pedidoDeEfeitoSuspensivo === 'SIM' %}[C/ EFEITO SUSPENSIVO] {% endif %}{{ d.texto }}

Argumentos:{% for a in d.argumentos %}
{{loop.index}}. {{ a.texto }}{% endfor %}
    
{% endfor %}