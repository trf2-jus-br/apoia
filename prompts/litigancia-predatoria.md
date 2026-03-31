# METADATA

uuid: acfa3a3c-fc1f-4952-ac6b-0e2766c5c1e5
name: Litigância Predatória
sort: 5
share: beta-teste
piece_strategy: peticao-inicial-e-anexos
successors:
  - path: chat

# PROMPT

Por favor, analise o texto da petição inicial e dos documentos anexos fornecids e atribua uma nota de 1 a 5 para cada um dos critérios abaixo, onde:

- **1** significa que o critério não está presente.
- **5** significa que o critério está fortemente presente.

Apresente o resultado em formato JSON, seguindo o exemplo fornecido.

**Critérios:**

1. **Requerimento de justiça gratuita sem justificativa aparente**  
2. **Pedido padronizado de dispensa de audiência preliminar ou de conciliação**
3. **Ajuizamento em comarca distinta do domicílio das partes ou do local do fato**
4. **Petição inicial genérica sem particularização dos fatos do caso concreto**
5. **Presença de causas de pedir alternativas relacionadas por hipóteses**
6. **Pedidos vagos, hipotéticos ou alternativos, sem relação lógica com a causa de pedir**  
7. **Propositura de ações repetitivas ou fragmentadas** (indício presente no texto ou menções a outros processos sem esclarecimentos)  
8. **Indícios de documentos incompletos, ilegíveis ou desconexos com a narrativa**  
9. **Procuração irregular ou sem poderes necessários** (seu conteúdo ou forma não conferem com o alegado)  
10. **Valor da causa elevado e sem relação com as pretensões formuladas**  
11. **Pedidos declaratórios ou alternativos sem utilidade prática, necessidade e adequação**  
12. **Outros aspectos que indiquem abusividade** (ex.: intenção de assédio processual, ajuizamento em foro estranho sem justificativa, etc.)

**Exemplo de JSON:**

```json
{
  "criteria": [
    {"number":1, "score": 3, "justification", "[Exemplo de justificativa sobre análise do critério 1]"},
    {"number":2, "score": 1, "justification", "[Exemplo de justificativa sobre análise do critério 2]"},
    ...
  ]
}
```

**Petição inicial e documentos anexos a serem analisados:**

{{textos}}

**Instruções adicionais:**

- Certifique-se de que o JSON final contenha apenas as chaves numéricas correspondentes aos critérios, conforme o exemplo.
- Não inclua comentários ou análises adicionais; apenas forneça o JSON com as notas.
- Caso um critério não possa ser avaliado com base no texto fornecido, atribua a nota **1**.




# JSON SCHEMA

{
    "type": "object",
    "properties": {
        "criteria": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "number": {
                        "type": "number"
                    },
                    "score": {
                        "type": "number"
                    },
                    "justification": {
                        "type": "string"
                    }
                },
                "required": [
                    "number",
                    "score",
                    "justification"
                ],
                "additionalProperties": false
            }
        }
    },
    "required": [
        "criteria"
    ],
    "additionalProperties": false
}


# FORMAT

{% set criterion = {
    '1': 'Requerimento de justiça gratuita sem justificativa aparente',
    '2': 'Pedido padronizado de dispensa de audiência preliminar ou de conciliação',
    '3': 'Ajuizamento em comarca distinta do domicílio das partes ou do local do fato',
    '4': 'Petição inicial genérica sem particularização dos fatos do caso concreto',
    '5': 'Presença de causas de pedir alternativas relacionadas por hipóteses',
    '6': 'Pedidos vagos, hipotéticos ou alternativos, sem relação lógica com a causa de pedir',
    '7': 'Propositura de ações repetitivas ou fragmentadas',
    '8': 'Indícios de documentos incompletos, ilegíveis ou desconexos com a narrativa',
    '9': 'Procuração irregular ou sem poderes necessários',
    '10': 'Valor da causa elevado e sem relação com as pretensões formuladas',
    '11': 'Pedidos declaratórios ou alternativos sem utilidade prática, necessidade e adequação',
    '12': 'Outros aspectos que indiquem abusividade'
} %}
<table class="table table-striped table-info table-sm">
<thead>
<tr><th>#</th><th>Critério</th><th class="text-end">Nota</th><th>Justificativa</th></tr>
</thead>
<tbody>
 {% set totalScore = 0 %}
    {% for d in criteria %}
      <tr>
        <td>{{ loop.index }}</td>
        <td>{{ criterion[d.number] }}</td>
        <th class="text-end">{{ d.score }}</th>
        <td>{{ d.justification }}</td>
      </tr>
      {% set totalScore = totalScore + d.score %}
    {% endfor %}
  </tbody>

  <tfoot>
    <tr>
      <th colspan="2">Média das notas</th>
      <th class="text-end">
        {{ (totalScore / criteria.length) | round(1) }}
      </th>
      <th></th>
    </tr>
  </tfoot>
</table>
