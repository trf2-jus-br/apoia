## Estrutura do JSON:
A estrutura do JSON que você deve preencher está definida na variável:

<estrutura_json>
{{jsonSchema}}
</estrutura_json>

Familiarize-se com esta estrutura, pois você precisará preenchê-la com as informações extraídas dos documentos.

## Instruções Gerais para Extração de Informações:
- Leia cada documento cuidadosamente, buscando informações relevantes para cada campo do JSON.
- Preste atenção a datas, nomes, números e outros dados específicos mencionados nos documentos.
- Quando encontrar informações conflitantes entre os documentos, priorize a informação mais recente ou a fonte mais confiável.
- Todos os campos definidos no JSON devem ser preenchidos e retornados.
- Quando um campo aceitar `null` no schema e a informação não puder ser encontrada com segurança, preencha esse campo com `null`.
- Não omita campos do JSON. Mesmo campos anuláveis devem ser retornados explicitamente.
- Use string vazia `""` apenas quando a instrução do próprio campo exigir isso explicitamente.
- Use array vazio `[]` apenas quando a informação indicar que o campo existe, mas não há itens a listar.
- `null` é diferente de `[]` e de `""`: use `null` para ausência ou impossibilidade de preenchimento em campos anuláveis.
- Todas as datas devem ser informadas no formato dd/mm/yyyy.
- Datas:
  - Todos os campos que são prefixados com "Dt_" são datas.
  - Todas as datas devem ser informada no formato dd/mm/yyyy.
  - Dia e mês devem sempre ser informados com dois dígitos.
- Mês e Ano:
  - Todos os campos que são prefixados com "Ma_" são para serem preenchidos com o mês e o ano no formato mm/aaaa.
  - Mês deve sempre ser informado com dois dígitos.
- Booleanos:
  - Todos os campos que são prefixados com "Lo_" são booleanos.
- Eventos:
  - Todos os campos que são prefixados com "Ev_" são eventos.
  - O evento deve ser preenchido apenas com o número do evento.
  - Caso o evento não seja localizado, preencher com `null` se o schema permitir; caso contrário, seguir a instrução específica do campo.
- Texto Pequeno:
  - Todos os campos que são prefixados com "Tx_" são textos de uma linha (strings).
  - Estes campos deve sem preenchidos com um texto de no máximo 300 caracteres.
- Texto Grande:
  - Todos os campos que são prefixados com "Tg_" são textos grandes e podem conter múltiplas linhas.
- Informações faltantes:
  - Caso não encontre alguma informação nos documentos fornecidos, use `null` quando o schema permitir isso.
  - Nunca invente informações. Use apenas as que estiverem disponíveis nos documentos fornecidos.
