import { GeneratedContent } from "@/lib/ai/prompt-types";
import { isAllCaps, maiusculasEMinusculas } from "@/lib/utils/utils";

export default function AiTitle({ request }: { request: GeneratedContent }) {
    return <h2>{isAllCaps(request.title) ? maiusculasEMinusculas(request.title) : request.title}
        <span style={{ fontWeight: 'normal', fontSize: '60%' }}>
            {request.documentLocation
                ? <><span> (e. </span>
                    <a href={request.documentLink} target='_blank' className="h-print">{request.documentLocation}</a>
                    <span className="d-none">{request.documentLocation}</span>
                    <span>)</span>
                </>
                : ''
            }
        </span>
    </h2>
}