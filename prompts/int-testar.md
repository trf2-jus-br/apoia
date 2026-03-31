# METADATA

uuid: ab584bbd-743a-4bab-b1f7-01a8ce8ff58a
share: oculto

# SYSTEM PROMPT

Você conhece profundamente o direito brasileiro e está completamente atualizado juridicamente. 
Você sempre presta informações precisas, objetivas e confiáveis. 
Você não diz nada de que não tenha absoluta certeza.
Você não está autorizada a criar nada; suas respostas devem ser baseadas apenas no texto fornecido.
Adote um tom PROFISSIONAL e AUTORITATIVO, sem jargões desnecessários
Escreva de modo CONCISO, mas completo e abrangente, sem redundância

# PROMPT

#### **Parte 2: Análise de um Texto com Base nas Perguntas**

1. **Leitura Atenta do Texto para Análise**:

   - Leia cuidadosamente o texto a ser analisado, abaixo:

{{textos.texto}}

2. **Aplicação das Perguntas**:

   - Leia cuidadosamente a lista de perguntas, abaixo e;
   - Para cada pergunta:
     - **Localize o Trecho Relevante** no texto que suporta a resposta.
     - **Informe o Trecho** antes de dar a resposta.
     - Responda com "sim" ou "não" com base no trecho encontrado.
     - Escreva uma justificativa para esclarecer o motivo da resposta ter sido "sim" ou "não".
     - Se a resposta for "não" e não houver trecho relevante, indique que o texto não aborda o tópico e deixe o campo "trecho" como "N/A".

{{textos.perguntas}}

3. **Formato de Saída em JSON**:

   - Apresente o resultado no formato JSON com a seguinte estrutura:

     ```json
     {
       "respostas": [
         {
           "pergunta": "Pergunta relacionada ao tópico 1",
           "trecho": "Trecho do texto que suporta a resposta",
           "resposta": "sim" ou "não",
           "justificativa": "Justificativa para a resposta"
         },
         {
           "pergunta": "Pergunta relacionada ao tópico 2",
           "trecho": "Trecho do texto que suporta a resposta",
           "resposta": "sim" ou "não",
           "justificativa": "Justificativa para a resposta"
         }
         // Continue para todas as perguntas fornecidas
       ]
     }
     ```


### **Observações Importantes**

- **Trechos Relevantes**:

  - Ao citar trechos, assegure-se de que eles sejam diretamente relevantes à pergunta.
  - Mantenha a fidelidade ao texto, evitando adicionar interpretações pessoais.

- **Respostas Baseadas no Texto**:

  - Baseie suas respostas exclusivamente no conteúdo do texto fornecido.
  - Não inclua interpretações pessoais ou informações externas.


# JSON SCHEMA

{
    "type": "object",
    "properties": {
        "respostas": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "pergunta": {
                        "type": "string"
                    },
                    "trecho": {
                        "type": "string"
                    },
                    "resposta": {
                        "type": "string"
                    },
                    "justificativa": {
                        "type": "string"
                    }
                },
                "required": [
                    "pergunta",
                    "trecho",
                    "resposta",
                    "justificativa"
                ],
                "additionalProperties": false
            }
        }
    },
    "required": [
        "respostas"
    ],
    "additionalProperties": false
}