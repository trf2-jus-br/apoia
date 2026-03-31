# METADATA

uuid: a9b50caa-89e6-46f7-933e-0abc09f8433a
share: oculto

# PROMPT

### **Instruções Gerais:**

Você receberá um **Texto de Referência** e deverá seguir os passos abaixo:

#### **Parte 1: Transformação do Texto de Referência em Tópicos e Perguntas**

1. **Leitura Atenta do Texto de Referência**:

   - Leia cuidadosamente o texto fornecido abaixo para entender todos os tópicos e ideias principais.

{{textos}}

2. **Identificação de Tópicos**:

   - Identifique e liste todos os tópicos ou ideias principais presentes no texto.

3. **Elaboração de Perguntas**:

   - Para cada tópico identificado, elabore uma pergunta clara e objetiva que possa ser respondida com "sim" ou "não".
   - As perguntas devem ser formuladas de maneira que uma resposta "sim" indique que um outro texto aborda o mesmo tópico ou ideia de forma semelhante ao texto de referência.

4. **Formato de Saída em JSON**:

   - Apresente o resultado no formato JSON com a seguinte estrutura:

     ```json
     {
       "topicos": [
         {
           "topico": "Descrição do tópico 1",
           "pergunta": "Pergunta relacionada ao tópico 1"
         },
         {
           "topico": "Descrição do tópico 2",
           "pergunta": "Pergunta relacionada ao tópico 2"
         }
         // Continue para todos os tópicos identificados
       ]
     }
     ```

### **Observações Importantes**

- **Precisão e Objetividade**:

  - Certifique-se de que os tópicos e perguntas capturam todas as ideias essenciais do Texto de Referência.
  - As perguntas devem ser específicas o suficiente para distinguir se outro texto possui ou não as mesmas ideias apresentadas.
