import { Plugin } from "@/lib/proc/combinacoes";
import { PluginProcessor, PluginContext } from "@/lib/ai/plugins/plugin-types";
import { TriagemPlugin } from "@/lib/ai/plugins/triagem-plugin";
import { NormasPlugin } from "@/lib/ai/plugins/normas-plugin";
import { PalavrasChavePlugin } from "@/lib/ai/plugins/palavras-chave-plugin";

const processors: PluginProcessor[] = [
    new TriagemPlugin(),
    new NormasPlugin(),
    new PalavrasChavePlugin(),
];

export async function processPlugins(plugins: Plugin[], text: string, context: PluginContext) {
    if (!plugins || plugins.length === 0) return;

    for (const pluginType of plugins) {
        const isJson = isJsonPlugin(pluginType);
        const basePluginType = mapToJsonBase(pluginType);

        const processor = processors.find(p => p.getPluginType() === basePluginType);
        if (processor) {
            try {
                await processor.process(text, context, isJson);
            } catch (error) {
                console.error(`Error processing plugin ${pluginType}:`, error);
            }
        }
    }
}

function isJsonPlugin(plugin: Plugin): boolean {
    return [Plugin.TRIAGEM_JSON, Plugin.NORMAS_JSON, Plugin.PALAVRAS_CHAVE_JSON].includes(plugin);
}

function mapToJsonBase(plugin: Plugin): Plugin {
    switch (plugin) {
        case Plugin.TRIAGEM_JSON: return Plugin.TRIAGEM;
        case Plugin.NORMAS_JSON: return Plugin.NORMAS;
        case Plugin.PALAVRAS_CHAVE_JSON: return Plugin.PALAVRAS_CHAVE;
        default: return plugin;
    }
}

export type { PluginContext };
