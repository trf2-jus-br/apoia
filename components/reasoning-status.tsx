import { ReasoningType } from "@/lib/ai/reasoning"
import { sanitizeHtml } from "@/lib/ui/sanitize-html"
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons"
import { faLightbulb } from "@fortawesome/free-regular-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

export default function Reasoning({ currentReasoning, showReasoning, setShowReasoning }: { currentReasoning: ReasoningType | undefined, showReasoning: boolean, setShowReasoning: (show: boolean) => void }) {
    return <div className="mb-1">
        <div className="mb-0">
            <div className={`text-wrap mb-0 chat-tool text-secondary`} >
                <FontAwesomeIcon icon={faLightbulb} className="me-1" />
                {currentReasoning?.title
                    ? <>
                        <span>{currentReasoning.title}</span>
                        {currentReasoning?.content
                            ? showReasoning
                                ? <button type="button" className="btn btn-link p-0 text-secondary ms-1" aria-expanded={showReasoning} aria-label="Ocultar raciocínio" onClick={() => setShowReasoning(!showReasoning)} style={{marginTop: "-.35em"}}><FontAwesomeIcon icon={faChevronUp} /></button>
                                : <button type="button" className="btn btn-link p-0 text-secondary ms-1" aria-expanded={showReasoning} aria-label="Mostrar raciocínio" onClick={() => setShowReasoning(!showReasoning)} style={{marginTop: "-.35em"}}><FontAwesomeIcon icon={faChevronDown} /></button>
                            : null
                        }
                        {showReasoning && <div className="mt-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentReasoning.content) }} />}
                    </>
                    : <div style={{ height: '6em', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentReasoning?.content) }} />
                    </div>
                }
            </div>
        </div>
    </div>
}