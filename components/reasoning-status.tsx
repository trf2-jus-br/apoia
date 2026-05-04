import { ReasoningType } from "@/lib/ai/reasoning"
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
                        <span dangerouslySetInnerHTML={{ __html: currentReasoning.title }} />
                        {currentReasoning?.content
                            ? showReasoning
                                ? <FontAwesomeIcon icon={faChevronUp} className="ms-1" style={{ cursor: 'pointer' }} onClick={() => setShowReasoning(!showReasoning)} />
                                : <FontAwesomeIcon icon={faChevronDown} className="ms-1" style={{ cursor: 'pointer' }} onClick={() => setShowReasoning(!showReasoning)} />
                            : null
                        }
                        {showReasoning && <div className="mt-2" dangerouslySetInnerHTML={{ __html: currentReasoning.content }} />}
                    </>
                    : <div style={{ height: '6em', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} dangerouslySetInnerHTML={{ __html: currentReasoning?.content }} />
                    </div>
                }
            </div>
        </div>
    </div>
}