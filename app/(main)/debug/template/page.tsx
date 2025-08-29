// server page that shows _html content of the preprocess

import { preprocess, VisualizationEnum } from "@/lib/ui/preprocess"


const original = ``

const resultado = ``

export default async function Page() {
    const preprocessed = preprocess(resultado, { kind: '', prompt: '', template: 'sim' }, { textos: [] }, true, VisualizationEnum.DIFF_HIGHLIGHT_INCLUSIONS, original)
    return <div className="alert alert-warning ai-content" dangerouslySetInnerHTML={{ __html: preprocessed.text }} />
}