import { GeneratedContent } from "@/lib/ai/prompt-types";
import { useModeUrl } from "@/lib/utils/use-mode-url";
import { isAllCaps, maiusculasEMinusculas } from "@/lib/utils/utils";

export default function AiTitle({ request }: { request: GeneratedContent }) {
    const modeUrl = useModeUrl()
    return <h2>{isAllCaps(request.title) ? maiusculasEMinusculas(request.title) : request.title}
        <span style={{ fontWeight: 'normal', fontSize: '60%' }}>
            {request.documentLocation
                ? <><span> (e. </span>
                    <a href={request.documentLink ? modeUrl(request.documentLink) : undefined} target='_blank' className="h-print">{request.documentLocation}</a>
                    <span>)</span>
                </>
                : ''
            }
        </span>
    </h2>
}