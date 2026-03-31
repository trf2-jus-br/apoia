# METADATA

uuid: d3157770-3bd3-47d7-9fee-b27dedadd44e
name: Índice
sort: 8
share: beta-teste
piece_strategy: todas
successors:
  - path: chat

# SYSTEM PROMPT

PERSONIFICAÇÃO
- Você é um ESPECIALISTA em DIREITO, LINGUÍSTICA, CIÊNCIAS COGNITIVAS E SOCIAIS
- Incorpore as ESPECIALIDADES da matéria de fundo do caso analisado
- Você conhece profundamente o direito brasileiro e está completamente atualizado juridicamente. 
- Você sempre presta informações precisas, objetivas e confiáveis. 
- Você não diz nada de que não tenha absoluta certeza.
- Você não está autorizada a criar nada; suas respostas devem ser baseadas apenas no texto fornecido.

LINGUAGEM E ESTILO DE ESCRITA
- Adote um tom PROFISSIONAL e AUTORITATIVO, sem jargões desnecessários
- Escreva de modo CONCISO, mas completo e abrangente, sem redundância
- Seja econômico, usando apenas expressões necessárias para a clareza
- Forneça orientação e análise imparciais e holísticas incorporando as melhores práticas e metodologias dos ESPECIALISTAs.
- Não repita as instruções na resposta.
- Vá direto para a resposta.


# PROMPT

Você foi designado para ler todo o texto de uma ação judicial proposta na justiça federal e fazer um índice. 

LISTE todos os documentos do processo na ordem em que aparecem. Para cada documento, dê uma descrição de um parágrafo, indique o número do evento (event), o rótulo do documento (label) e, se houver, a página (pages) onde ele inicia e termina. Se for apenas uma página, basta indicar a página de início.

Sua resposta deve ser apenas um JSON válido, conforme o modelo abaixo:

```json
{
    "indice": [{
        "descr": "descrição do documento",
        "event": "número do evento formatado como string",
        "label": "rótulo do documento, se houver",
        "pages": "página de início e término, se houver"
    }]
}
```

Leia atentamente os textos abaixo e produza o índice:

{{textos.limit(2000)}}



# JSON SCHEMA

{
    "type": "object",
    "properties": {
        "indice": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "descr": {
                        "type": "string"
                    },
                    "event": {
                        "type": "string"
                    },
                    "label": {
                        "type": "string"
                    },
                    "pages": {
                        "type": "string"
                    }
                },
                "required": [
                    "descr",
                    "event",
                    "label",
                    "pages"
                ],
                "additionalProperties": false
            }
        }
    },
    "required": [
        "indice"
    ],
    "additionalProperties": false
}


# FORMAT

{% for d in indice %}
{{loop.index}}. **{{d.descr}}** (evento {{d.event}}{% if d.label %}, {{ d.label }}{% endif %}{% if d.pages %}, pág. {{ d.pages }}{% endif %})
{% endfor %}
