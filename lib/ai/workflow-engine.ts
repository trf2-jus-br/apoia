import { GeneratedContent, PromptAdditionalInformationType, PromptDataType, PromptDefinitionType } from "@/lib/ai/prompt-types";
import { generateContent } from "@/lib/ai/generate";
import { getPromptDefinitionByUuid, getPromptDefinition } from "@/lib/ai/prompt-store";
import { IAGenerated, IAPrompt } from "@/lib/db/mysql-types";
import { slugify } from "@/lib/utils/utils";
import devLog from "@/lib/utils/log";
import { Plugin } from "@/lib/proc/combinacoes";
import { processPlugins } from "@/lib/ai/plugins";
import { getTools } from "@/lib/ai/tools";

export interface WorkflowExecutionResult {
    prompt: PromptDefinitionType;
    generated: IAGenerated;
    content: GeneratedContent;
}

export class WorkflowEngine {
    private results = new Map<string, IAGenerated>(); // uuid -> result
    private executionId: string;
    private tools: any;

    constructor(private user: any) {
        this.executionId = crypto.randomUUID();
    }

    async execute(aggregator: IAPrompt, data: PromptDataType, additionalInfo?: PromptAdditionalInformationType): Promise<WorkflowExecutionResult[]> {
        this.tools = await getTools(this.user);
        const finalResults: WorkflowExecutionResult[] = [];
        const content = aggregator.content as any;

        // 1. Predecessors
        if (content.workflow?.predecessors?.length) {
            for (const step of content.workflow.predecessors) {
                await this.executeStep(step.uuid, data, aggregator.id, finalResults);
            }
        }

        // 2. Main Prompt (if exists)
        if (content.system_prompt || content.prompt || content.template) {
            const definition: PromptDefinitionType = {
                kind: aggregator.slug || `prompt-${aggregator.id}`,
                name: aggregator.name,
                prompt: content.prompt,
                systemPrompt: content.system_prompt,
                jsonSchema: content.json_schema,
                format: content.format,
                template: content.template,
                cacheControl: true,
                dbId: aggregator.id,
                uuid: aggregator.uuid,
                metadata: {
                    target: content.target,
                    profile: content.profile,
                }
            };
            await this.runPrompt(definition, data, null, finalResults, (aggregator.content as any).plugins);
        }

        // 3. Successors
        if (content.workflow?.successors?.length) {
            for (const step of content.workflow.successors) {
                await this.executeStep(step.uuid, data, aggregator.id, finalResults);
            }
        }

        // 4. Fallback Chat
        if (!aggregator.name?.toLowerCase().startsWith('chat ') && !finalResults.some(r => r.prompt.kind.startsWith('chat'))) {
             try {
                const chatDef = await getPromptDefinition('chat');
                await this.runPrompt(chatDef, data, aggregator.id, finalResults);
             } catch (e) {
                 devLog('Failed to load fallback chat', e);
             }
        }

        return finalResults;
    }

    private async executeStep(uuid: string, data: PromptDataType, aggregatorId: number, finalResults: WorkflowExecutionResult[]): Promise<void> {
        if (this.results.has(uuid)) return;

        const def = await getPromptDefinitionByUuid(uuid).catch(e => {
            devLog(`[WorkflowEngine] Could not resolve UUID ${uuid}: ${e.message}`);
            return null;
        });

        if (!def) return;
        if (def.kind === 'resumos') return; // Skip special case for now

        await this.runPrompt(def, data, aggregatorId, finalResults);
    }

    private async runPrompt(def: PromptDefinitionType, data: PromptDataType, aggregatorId: number | null, finalResults: WorkflowExecutionResult[], plugins?: Plugin[]): Promise<void> {
        const info: PromptAdditionalInformationType = {
            execution_id: this.executionId,
            aggregator_prompt_id: aggregatorId,
        };

        const result = await generateContent(def, data, this.tools, info);
        if (def.uuid) this.results.set(def.uuid, result);

        const effectivePlugins = plugins || (def as any).plugins || [];

        // Auto-detect plugins from prompt content markers for backward compatibility
        if (def.prompt) {
            if (def.prompt.includes('# Triagem') && !effectivePlugins.includes(Plugin.TRIAGEM)) {
                effectivePlugins.push(Plugin.TRIAGEM);
            }
            if (def.prompt.includes('# Normas/Jurisprudência Invocadas') && !effectivePlugins.includes(Plugin.NORMAS)) {
                effectivePlugins.push(Plugin.NORMAS);
            }
            if (def.prompt.includes('# Palavras-Chave') && !effectivePlugins.includes(Plugin.PALAVRAS_CHAVE)) {
                effectivePlugins.push(Plugin.PALAVRAS_CHAVE);
            }
        }

        const content: GeneratedContent = {
            id: result.id,
            documentCode: null,
            documentDescr: null,
            data,
            title: def.name || def.kind,
            produto: def.kind,
            promptSlug: def.kind,
            internalPrompt: def,
            generated: result.generation,
            plugins: effectivePlugins
        };

        finalResults.push({ prompt: def, generated: result, content });
    }

    getExecutionId() {
        return this.executionId;
    }
}
