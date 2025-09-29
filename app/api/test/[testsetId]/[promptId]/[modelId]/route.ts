import { streamContent } from '@/lib/ai/generate'
import { NextResponse } from 'next/server'
import { DeepPartial, StreamObjectResult, StreamTextResult, ToolSet } from 'ai'
import { removeEmptyKeys } from '@/lib/utils/utils'
import { PromptDefinitionType, PromptOptionsType } from '@/lib/ai/prompt-types'
import { ProgressType } from '@/lib/progress'
import { Dao } from '@/lib/db/mysql'
import { slugify } from '@/lib/utils/utils'
import { ATTEMPTS, buildTest, preprocessQuestion } from '../../../../../../lib/ai/test/test-config'
import { getInternalPrompt, promptDefinitionFromDefinitionAndOptions } from '@/lib/ai/prompt'
import { getCurrentUser } from '@/lib/user'

export const maxDuration = 60


export async function GET(
  req: Request,
  props: { params: Promise<{ testsetId: number, promptId: number, modelId: number }> }
) {
  const params = await props.params;
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })

  const encoder = new TextEncoder()

  const stream = new ReadableStream<any>({
    async start(controller) {
      controller.enqueue('{');
      await execute(params.testsetId, params.promptId, params.modelId, controller)
      controller.enqueue('}');
      controller.close()
    }
  })
  const res = new NextResponse(stream);
  res.headers.set('Content-Type', 'application/json; charset=utf-8'); //'text/html; charset=utf-8');
  return res;
}

const execute = async (testsetId: number, promptId: number, modelId: number, controller) => {
  let test = await Dao.retrieveTestByTestsetIdPromptIdAndModelId(testsetId, promptId, modelId)
  if (test) throw new Error('Test already exists')

  controller.enqueue(`"testsetId": "${testsetId}",`)
  controller.enqueue(`"promptId": "${promptId}",`)
  controller.enqueue(`"modelId": "${modelId}"`)

  const testset = await Dao.retrieveTestsetById(testsetId)
  if (!testset) throw new Error('Testset not found')
  const testsetModel = await Dao.retrieveModelById(testset.model_id)
  if (!testsetModel) throw new Error('Testset model not found')
  const prompt = await Dao.retrievePromptById(promptId)
  const model = await Dao.retrieveModelById(modelId)

  if (!testset || !prompt || !model)
    throw new Error('Testset, Prompt or Model not found')

  if (prompt.content.format)
    controller.enqueue(`,"promptFormat": "${encodeJsonString(prompt.content.format)}"`)

  let testCount = testset.content.tests.length
  let stepMax = testCount * 2 * ATTEMPTS + 1
  let stepCount = 0
  const yieldProgress = (s: string, percent: number) => { controller.enqueue(`,\n"progress-${stepCount++}": ${JSON.stringify({ s, percent })}`) }

  const progress: ProgressType = {
    set: (s: string, percent: number) => {
      console.log(`Progress: ${s} (${percent}%)`)
      yieldProgress(s, percent)
    },
    remove: () => {
      console.log(`Progress: removed`)
    }
  }

  const promptResults: string[] = []
  const questionsResults: any[] = []

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    yieldProgress(`Ciclo ${attempt + 1}`, 0)
    for (let i = 0; i < testset.content.tests.length; i++) {
      const test = testset.content.tests[i]
      yieldProgress(`Teste ${i} - ${test.name} - Executando Prompt`, 0)
      const data: any = { textos: test.texts.map(t => ({ descr: t.name, slug: slugify(t.name), texto: t.value })) }
      const date = new Date()
      const definition: PromptDefinitionType = {
        kind: prompt.kind,
        systemPrompt: prompt.content.system_prompt || '',
        prompt: prompt.content.prompt || '',
        jsonSchema: prompt.content.json_schema || '',
        format: prompt.content.format || '',
        model: model.name,
        cacheControl: attempt + 1
      }
      removeEmptyKeys(definition)
      const resultStream = await streamContent(definition, data)
      const result = await streamString(`prompt-result-${attempt * stepMax + i * 2}`, resultStream, controller)
      console.log(`Result: ${result}`)
      promptResults.push(result)

      yieldProgress(`Teste ${i} - ${test.name} - Testando o Resultado`, 0)
      const data2: any = {
        textos: [
          { descr: 'TEXTO', slug: 'texto', texto: result },
          { descr: 'PERGUNTAS:', slug: 'perguntas', texto: JSON.stringify(test.questions.map(q => ({ question: preprocessQuestion(q.question) }))) }]
      }
      const options2: PromptOptionsType = {
        overrideModel: testsetModel.name
      }
      removeEmptyKeys(options2)
      const definition2 = promptDefinitionFromDefinitionAndOptions(getInternalPrompt('int-testar'), options2)

      const resultStream2 = await streamContent(definition2, data2)
      const result2 = await streamString(`questions-result-${attempt * stepMax + i * 2 + 1}`, resultStream2, controller)
      console.log(`Result2: ${result2}`)
      questionsResults.push(JSON.parse(result2))
    }
  }

  yieldProgress(`Gravando resultados`, 0)
  const testToInsert = buildTest(testset, prompt, model, promptResults, questionsResults)
  Dao.insertIATest(testToInsert)
  yieldProgress('', 0)
}

function encodeJsonString(s: string): string {
  return JSON.stringify(s).slice(1, -1)
}

async function streamString(key: string, stream: StreamTextResult<ToolSet, any> | StreamObjectResult<DeepPartial<any>, any, never> | string, controller) {
  controller.enqueue(`,\n"${key}": "`)
  let text: string
  if (typeof stream === 'string') {
    controller.enqueue(encodeJsonString(stream))
    text = stream
  } else {
    text = ''
    for await (const textPart of stream.textStream) {
      process.stdout.write(textPart)
      controller.enqueue(encodeJsonString(textPart))
      text += textPart
    }
    // text = await (stream as StreamTextResult<Record<string, CoreTool<any, any>>>).text
  }
  controller.enqueue(`"`)
  return text
}

