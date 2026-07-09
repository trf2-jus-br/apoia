import { Plugin } from "@/lib/proc/combinacoes";
import { PluginProcessor, PluginContext } from "@/lib/ai/plugins/plugin-types";
import { getTriagem } from "@/lib/fix";
import { BatchDao, EnumDao } from "@/lib/db/dao";
import devLog from "@/lib/utils/log";

export class TriagemPlugin implements PluginProcessor {
    getPluginType(): Plugin {
        return Plugin.TRIAGEM;
    }

    async process(text: string, context: PluginContext, isJson?: boolean): Promise<void> {
        if (!context.batch_dossier_id) return;

        let triage: string | null = null;
        if (isJson) {
            try {
                const json = JSON.parse(text);
                triage = json.triagem || json.triage;
            } catch (e) {
                devLog('Error parsing JSON for Triagem plugin', e);
            }
        } else {
            triage = getTriagem(text);
        }

        if (!triage) return;

        const enum_id = await EnumDao.assertIAEnumId(Plugin.TRIAGEM);
        const enum_item_id = await EnumDao.assertIAEnumItemId(triage, enum_id);
        await BatchDao.assertIABatchDossierEnumItemId(context.batch_dossier_id, enum_item_id);
    }
}
