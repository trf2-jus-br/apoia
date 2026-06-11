import { Plugin } from "@/lib/proc/combinacoes";

export interface PluginContext {
    execution_id?: string;
    aggregator_prompt_id?: number | null;
    batch_dossier_id?: number;
    document_id?: number | null;
}

export interface PluginProcessor {
    getPluginType(): Plugin;
    process(text: string, context: PluginContext, isJson?: boolean): Promise<void>;
}
