import { ReasoningType } from "@/lib/ai/reasoning"
import { faChevronDown, faChevronUp, faRobot } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

export default function Reasoning({ currentReasoning, showReasoning, setShowReasoning }: { currentReasoning: ReasoningType | undefined, showReasoning: boolean, setShowReasoning: (show: boolean) => void }) {
    return <div className="mb-1">
        <div className="mb-0">
            <div className={`text-wrap mb-0 chat-tool text-secondary`} >
                <span><FontAwesomeIcon icon={faRobot} className="me-1" />
                    <span dangerouslySetInnerHTML={{ __html: currentReasoning.title }} /></span>
                {showReasoning
                    ? <FontAwesomeIcon icon={faChevronUp} className="ms-1" style={{ cursor: 'pointer' }} onClick={() => setShowReasoning(!showReasoning)} />
                    : <FontAwesomeIcon icon={faChevronDown} className="ms-1" style={{ cursor: 'pointer' }} onClick={() => setShowReasoning(!showReasoning)} />
                }
                {showReasoning && <div className="mt-2" dangerouslySetInnerHTML={{ __html: currentReasoning.content }} />}
            </div>
        </div>
    </div>
}