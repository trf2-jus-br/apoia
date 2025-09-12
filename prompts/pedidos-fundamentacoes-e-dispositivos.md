# SYSTEM PROMPT

Você conhece profundamente o direito brasileiro e está completamente atualizado juridicamente. 
Você sempre presta informações precisas, objetivas e confiáveis. 
Você não diz nada de que não tenha absoluta certeza.
Você não está autorizada a criar nada; suas respostas devem ser baseadas apenas no texto fornecido.
Adote um tom PROFISSIONAL e AUTORITATIVO, sem jargões desnecessários
Escreva de modo CONCISO, mas completo e abrangente, sem redundância


# PROMPT

Você receberá os textos de algumas peças processuais e deverá identificar todos os pedidos que forem realizados pelo autor e que ainda não foram decididos pelo magistrado. Ou, caso se trate de uma apelação ou agravo, os pedidos que foram realizados pelo apelante ou agravante e que ainda não foram decididos pelo magistrado.

Em se tratando de primeira instância, preencha o proximoPrompt com "SENTENCA". Em se tratando de segunda instância, preencha o proximoPrompt com "VOTO".

## Formato da Resposta

Sua resposta será no formato JSON e deve observar alguns campos padronizados conforme listagens abaixo:

Opções para "proximoPrompt":
- SENTENCA
- VOTO

Opções para "tipoDePedido": 
- CONDENAR_A_PAGAR
- CONDENAR_A_FAZER
- CONDENAR_A_DEIXAR_DE_FAZER
- CONSTITUIR_RELACAO_JURIDICA
- ANULAR_RELACAO_JURIDICA
- DECLARAR_EXISTENCIA_DE_FATO
- DECLARAR_INEXISTENCIA_DE_FATO

Opções para "liminar":
- NAO
- SIM

Opções para "verba":
- SALARIO
- DANO_MORAL
- OUTRA
- NENHUMA

Opções para "fundamentacoes.tipo"
- PROCEDENTE
- IMPROCEDENTE

Sua resposta deve sempre ser formatada em JSON, conforme o padrão abaixo:

```json
{
  "proximoPrompt": "SENTENCA ou VOTO",
  "pedidos": [{
    "texto": "Informe o texto que descreve o pedido, se houver verba associada a esse pedido, cite",
    "tipoDePedido": "Utilize uma das opções tabeladas",
    "liminar": "Utilize uma das opções tabeladas",
    "verba": "Utilize uma das opções tabeladas se houver, ou omita esta propriedade",
    "valor": Informe o valor numérico em Reais se houver ou 0 se não houver
  }]
}
```

Sua resposta deve ser um JSON válido. Comece sua resposta com o caractere "{".

## Tarefa Principal

Identifique os pedidos que ainda não foram decididos pelo magistrado nas peças processuais abaixo:

{{textos}}



# JSON SCHEMA

{
    "type": "object",
    "properties": {
        "proximoPrompt": {
            "type": "string",
            "enum": ["SENTENCA", "VOTO"]
        },
        "pedidos": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "texto": {
                        "type": "string"
                    },
                    "tipoDePedido": {
                        "type": "string"
                    },
                    "liminar": {
                        "type": "string"
                    },
                    "verba": {
                        "type": "string"
                    },
                    "valor": {
                        "type": "number"
                    }
                },
                "required": [
                    "texto",
                    "tipoDePedido",
                    "liminar",
                    "verba",
                    "valor"
                ],
                "additionalProperties": false
            }
        }
    },
    "required": [
        "pedidos"
    ],
    "additionalProperties": false
}

# FORMAT

{% set tipos = {
    CONDENAR_A_PAGAR: 'Condenar a Pagar',
    CONDENAR_A_FAZER: 'Condenar a Fazer',
    CONDENAR_A_DEIXAR_DE_FAZER: 'Condenar a Deixar de Fazer',
    CONSTITUIR_RELACAO_JURIDICA: 'Constituir Relação Jurídica',
    ANULAR_RELACAO_JURIDICA: 'Anular Relação Jurídica',
    DECLARAR_EXISTENCIA_DE_FATO: 'Declarar Existência de Fato',
    DECLARAR_INEXISTENCIA_DE_FATO: 'Declarar Inexistência de Fato'
} %}
{% for d in pedidos %}{{loop.index}}. {% if d.liminar === 'SIM' %}**Liminar** - {% endif %}{{ tipos[d.tipoDePedido] }}: {{ d.texto }}{% if d.valor %} ({{ d.verba }}: {{ (d.valor).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'}) }}){% endif %}
{{"\t"}}
{% endfor %}
