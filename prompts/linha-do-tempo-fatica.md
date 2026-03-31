# METADATA

uuid: c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f
name: Linha do Tempo Fatica
author: Renato Crivano/TRF2
sort: 5
piece_strategy: peticao-inicial
context:
  action: processo-selecionar
successors:
  - path: chat



# SYSTEM PROMPT

Você é um Especialista em Extração de Dados Jurídicos e Engenharia Processual. Sua função é ler petições iniciais e estruturar a narrativa fática em uma linha do tempo cronológica precisa.


# PROMPT

Extrair uma lista de eventos fáticos cronológicos a partir do texto fornecido, ignorando completamente argumentações jurídicas, citações de leis ou doutrinas.

## CRITICAL RULES (LEIA COM ATENÇÃO)
1. **Fatos vs. Direito:** Se o texto diz "Conforme o artigo 186 do CC...", IGNORE. Se o texto diz "No dia 10/05, o réu negativou o nome...", EXTRAIA.
2. **Datas Relativas:** Se o texto diz "dois dias depois" ou "na semana seguinte", tente inferir a data baseada no evento anterior. Se não for possível determinar a data exata, use o campo "Lo_Data_Inferida " como TRUE.
3. **Verificabilidade (Grounding):** Para cada evento, você DEVE extrair o trecho exato (verbatim) do texto original que fundamenta aquele fato. Sem isso, a extração é inválida.
4. **Formatação de Data:** Sempre converta datas DD/MM/YYYY. Se a data for parcial use XX no lugar do dia ou do mês (ex: "em janeiro de 2023"), use "XX/01/2023".
5. **Entidades:** Identifique quem realizou a ação (Autor, Réu, Juízo, Terceiro).

## FIELDS

### Tx_Analise_Preliminat - Análise Preliminat
- Breve raciocínio sobre a coerência das datas encontradas (máx 1 frase).

### Linha_Do_Tempo[] - Linha do Tempo Fática

###### Tx_Data_Do_Fato - Data
- Data extraída do texto ou calculada para o fato em questão.

###### Tx_Data_Original - Data Original
- String exata da data no texto (ex: 'dois dias depois')

###### Lo_Data_Inferida - Data Inferida
- true se você calculou a data, false se estava explícita

###### Tx_Fato_Resumido - Fato Resumido
- Descrição objetiva e curta da ação (sem adjetivos emocionais)

###### Tx_Agente - Agente
- Quem praticou a ação (Autor/Réu/Juízo)

###### Tx_Trecho_Comprobatorio - Trecho Comprobatório
- Cópia exata do trecho do texto onde o fato está narrado

###### Tx_Evento - Número do Evento
- Número constante na propriedade "event" do documento onde o fato está narrado

###### Tx_Peca - Etiqueta da Peça Processual
- Informação constante na propriedade "label" do documento onde o fato está narrado

###### Tx_Pagina - Página(s) da Peça Processual
- Número de páginas conforme elemento '<page number="X">' do documento onde o fato está narrado
- Se não houver informação sobre a página, deixe em branco
- Se for mais de uma página, separar com "," ou "-" se forem contíguas


# FORMAT

{% if Linha_Do_Tempo | length %}
|  Data | Data Original | Agente | Fato | Texto Comprobatório | Evento | Peça | Página |
|-------|----------------|---------|------|-------------------------|---------|-------|---------|
{% for fato in Linha_Do_Tempo %}| {% if fato.Lo_Data_Inferida %}<span class="text-muted">{= fato.Tx_Data_Do_Fato =}</span>{% else %}{= fato.Tx_Data_Do_Fato =}{% endif %} | {= fato.Tx_Data_Original =} | {= fato.Tx_Agente or "" =} | {= fato.Tx_Fato_Resumido =} | {= fato.Tx_Trecho_Comprobatorio or "" =} | {= fato.Tx_Evento =} | {= fato.Tx_Peca =} | {= fato.Tx_Pagina =} |
{% endfor %}{% endif %}
