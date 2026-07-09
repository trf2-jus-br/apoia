import { Plugin } from "@/lib/proc/combinacoes";
import { PluginProcessor, PluginContext } from "@/lib/ai/plugins/plugin-types";
import { getPalavrasChave } from "@/lib/fix";
import { BatchDao, EnumDao } from "@/lib/db/dao";
import devLog from "@/lib/utils/log";

export class PalavrasChavePlugin implements PluginProcessor {
    getPluginType(): Plugin {
        return Plugin.PALAVRAS_CHAVE;
    }

    async process(text: string, context: PluginContext, isJson?: boolean): Promise<void> {
        if (!context.batch_dossier_id) return;

        let palavrasChave: string[] = [];
        if (isJson) {
            try {
                const json = JSON.parse(text);
                palavrasChave = json.palavrasChave || json.keywords || [];
            } catch (e) {
                devLog('Error parsing JSON for PalavrasChave plugin', e);
            }
        } else {
            palavrasChave = getPalavrasChave(text);
        }
        if (!palavrasChave || palavrasChave.length === 0) return;

        const enum_id = await EnumDao.assertIAEnumId(Plugin.PALAVRAS_CHAVE);
        for (const palavraChave of palavrasChave) {
            const enum_item_id = await EnumDao.assertIAEnumItemId(palavraChave, enum_id);
            await BatchDao.assertIABatchDossierEnumItemId(context.batch_dossier_id, enum_item_id);
        }
    }
}
