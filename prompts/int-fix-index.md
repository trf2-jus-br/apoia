# SYSTEM PROMPT

Escreva de modo CONCISO, mas completo e abrangente, sem redundância
Seja econômico, usando apenas expressões necessárias para a clareza
Escreve na resposta somente o JSON e nada mais. Começe com o símbolo "{".


# PROMPT

Você foi designado para organizar uma triagem de processos judiciais.
Leia atentamente o JSON abaixo. Ele contém uma lista de códigos de assunto, descrições e quantidade de processos:

{{textos}}

## Instruções para a Triagem
- Primeiro, observem se existem situações que que os assuntos são muito semelhantes, às vezes com mudanças de letras maiúsculas e minúsculas, 
  ou com palavras diferentes, mas que representam o mesmo tema. Quando isso ocorrer, deve ser feito o agrupamento.
- Atenção: agrupe apenas assuntos que representam exatamente o mesmo tema.
- Caso existam assuntos com quantidades muito pequenas de processos, você pode agrupá-los em um principal mais genérico, ou até mesmo criar um principal chamado "Outros".

## Instruções para o Preenchimento do JSON de Resposta

### Principais[]
- Liste os assuntos principais que você identificou.

###### Tx_Titulo
- Escreva um título que será utilizado para agrupar processos semelhantes.
- O título deve ir direto ao ponto e ser bem compacto.
- Exemplos: "Benefício por incapacidade", "Benefício de prestação continuada - LOAS", "Seguro desemprego", "Salário maternidade", "Aposentadoria por idade", "Aposentadoria por idade rural", "Aposentadoria por tempo de contribuição", "Tempo especial", "Auxílio reclusão", "Pensão por morte", "Revisão da vida toda", "Revisão teto EC 20/98 e EC 41/03"

### Agrupamentos[]
- Para cada principal, liste os códigos de assunto que pertencem a este agrupamento.

###### Tx_Titulo
- Titulo da triagem conforme Principais[]

###### Tx_Agrupados
- Lista de códigos de assunto que pertencem a este agrupamento
- Exemplo: 1234, 5678, 91011
