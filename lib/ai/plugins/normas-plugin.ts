import { Plugin } from "@/lib/proc/combinacoes";
import { PluginProcessor, PluginContext } from "@/lib/ai/plugins/plugin-types";
import { getNormas } from "@/lib/fix";
import { BatchDao, EnumDao } from "@/lib/db/dao";
import devLog from "@/lib/utils/log";

export class NormasPlugin implements PluginProcessor {
    getPluginType(): Plugin {
        return Plugin.NORMAS;
    }

    async process(text: string, context: PluginContext, isJson?: boolean): Promise<void> {
        if (!context.batch_dossier_id) return;

        let normas: string[] = [];
        if (isJson) {
            try {
                const json = JSON.parse(text);
                normas = json.normas || json.rules || [];
            } catch (e) {
                devLog('Error parsing JSON for Normas plugin', e);
            }
        } else {
            normas = getNormas(text);
        }
        if (!normas || normas.length === 0) return;

        const enum_id = await EnumDao.assertIAEnumId(Plugin.NORMAS);
        for (const norma of normas) {
            const enum_item_id = await EnumDao.assertIAEnumItemId(norma, enum_id);
            await BatchDao.assertIABatchDossierEnumItemId(context.batch_dossier_id, enum_item_id);
        }
    }
}
