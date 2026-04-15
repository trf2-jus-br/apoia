# METADATA

uuid: 118bac70-1aaa-46fc-90fc-328b19906307
name: Identificação de Tema de Suspensão
sort: 3
piece_strategy: suspensao
plugins:
  - triagem-json
successors:
  - path: chat

# SYSTEM PROMPT

Você é um assistente de magistrado altamente experiente, especialista em Direito Civil e Processual Civil.


# PROMPT

## OBJETIVO
Leia o conteúdo da peça processual fornecida abaixo e tente idenficar se ela sugere alguma suspensão por Recurso Especial Repetitivo, ou Recurso Extraordinário com Repercussão Geral, ou Tema da Turma Nacional de Uniformização (TNU) ou Incidente de Resolução de Demandas Repetitivas (IRDR). Caso haja indícios claros de que a peça se refere a um desses casos, informe isso no JSON de saída.

Se você localizar o leading case, ou seja, o caso paradigmático que deu origem à suspensão, mas não localizar o número do tema, utilize a ferramenta (tool) getLeadingCaseSearch para tentar localizar o número do tema a partir do leading case. Se você localizar o número do tema, preencha o campo Nr_Tema com esse número. Caso contrário, deixe o campo Nr_Tema zerado.

## FIELDS READONLY

### Tx_Peca - Rótulo da Peça Analisada
- Informe o rótulo da peça processual analisada, por exemplo "DESPADEC1", "SENT1", etc, conforme o campo "label" da peça processual.
- Caso não tenha sido fornecida uma peça processual, deixe esse campo em branco.

### Ev_Evento - Evento da Peça Analisada
- Informe o evento da peça processual analisada, por exemplo "1", "2", etc, conforme o campo "event" da peça processual.
- Caso não tenha sido fornecida uma peça processual, deixe esse campo em branco.

### Lo_Tema - Tema Presente
- Informe true, caso haja indícios claros de que a peça se refere a um desses casos: Recurso Especial Repetitivo, Recurso Extraordinário com Repercussão Geral, ou Tema da Turma Nacional de Uniformização (TNU) ou Incidente de Resolução de Demandas Repetitivas (IRDR). Caso contrário, informe false.

### Nr_Tema - Número do Tema
- Se a peça processual indicar que o recurso é um Recurso Especial Repetitivo, informe o número do Tema do STJ relacionado a esse Recurso Especial Repetitivo, por exemplo "123".

### Tx_Tribunal - Tribunal do Tema
- Informe "STJ", "STF", "TNU" ou "IRDR", conforme o caso, caso haja indícios claros de que a peça se refere a um desses casos. Caso contrário, deixe esse campo em branco.

### triagem - Triagem
- Deixar em branco se qualquer das opções abaixo for verdadeira:
  - Lo_Tema seja false;
  - Nr_Tema esteja vazio;
  - Nr_Tema seja 0;
  - Tx_Tribunal esteja vazio.
- Preencher com um prefixo em letras minúsculas imediatamente por um hifem e pelo número do tema, sem espaços, caso Lo_Tema seja true. Por exemplo, "stf-rg-123" ou "stj-rr-456" ou "tnu-789". Os prefixos possíveis são:
  - stf-rg para Recurso Extraordinário com Repercussão Geral
  - stj-rr para Recurso Especial Repetitivo
  - tnu para temas julgados pela TNU
  - irdr para Incidente de Resolução de Demandas Repetitivas (IRDR)

Leia os documentos abaixo e preencha o JSON de saída.

{{textos}}

# FORMAT
{% if Lo_Tema %}Tema identificado: {{ Nr_Tema if Nr_Tema !== 0 else '?'}} ({{ Tx_Tribunal }}){% else %}Não foi identificado tema de suspensão.{% endif %}