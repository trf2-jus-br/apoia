import { ReactElement } from "react"
import { UIMessage, UIMessagePart } from "ai"
import { joinWithAnd } from "@/lib/utils/utils"

export default function ToolUsage({ m }: { m: UIMessage }) {
    return m?.parts?.find((part) => part.type.startsWith('tool-')) && (<div className="mb-1">
        {m?.parts?.filter((part) => part.type.startsWith('tool-'))?.map((part, index) => (
            <div key={index} className="mb-0">
                <div className={`text-wrap mb-0 chat-tool`}>
                    {toolMessage(part)}
                </div>
            </div>
        ))}
    </div>)
}

function toolMessage(part: UIMessagePart<any, any>): ReactElement {
    const regexPiece = /^(.+):$\n<[a-z\-]+ event="([^"]+)"/gm
    const regexLibrary = /<library id="\d+" title="([^"]+)"/gm
    if (!part) return null
    switch (part.type) {
        case 'tool-getProcessMetadata':
            switch (part.state) {
                case 'input-streaming':
                    return <span className="text-secondary">Acessando dados de processo...</span>
                case 'input-available':
                    return (<span className="text-secondary">Obtendo dados do processo: {part.input?.processNumber}...</span>)
                case 'output-available':
                    return (<span className="text-secondary">Consultei dados do processo: {part.input?.processNumber}</span>)
                case 'output-error':
                    return <div>Error: {part.errorText}</div>;
            }
        case 'tool-getPiecesText':
            switch (part.state) {
                case 'input-streaming':
                    return <span className="text-secondary">Acessando peças...</span>
                case 'input-available':
                    if (part.input.pieceIdArray?.length === 1)
                        return <span className="text-secondary">Obtendo conteúdo da peça: {part.input.pieceIdArray[0]}...</span>
                    else if (part.input.pieceIdArray?.length > 1)
                        return <span className="text-secondary">Obtendo conteúdo das peças: {part.input.pieceIdArray.join(', ')}...</span>
                    else
                        return <span className="text-secondary">Obtendo conteúdo das peças...</span>
                case 'output-available':
                    const matches = []
                    let match
                    regexPiece.lastIndex = 0 // Reset regex state
                    while ((match = regexPiece.exec(part.output)) !== null) {
                        const kind = match[1].trim()
                        const eventNumber = match[2]
                        matches.push(`${kind} (${eventNumber})`)
                    }
                    if (matches.length === 1)
                        return <span className="text-secondary">Consultei conteúdo da peça: {matches[0]}</span>
                    else
                        return <span className="text-secondary">Consultei conteúdo das peças: {matches.join(', ')}</span>
                case 'output-error':
                    return <div>Error: {part.errorText}</div>;
            }
        case 'tool-getLibraryDocument':
            switch (part.state) {
                case 'input-streaming':
                    return <span className="text-secondary">Acessando a biblioteca...</span>
                case 'input-available':
                    if (part.input.documentIdArray?.length === 1)
                        return <span className="text-secondary">Obtendo conteúdo do documento: {part.input.documentIdArray[0]}...</span>
                    else if (part.input.pieceIdArray?.length > 1)
                        return <span className="text-secondary">Obtendo conteúdo dos documentos: {part.input.documentIdArray.join(', ')}...</span>
                    else
                        return <span className="text-secondary">Obtendo conteúdo dos documentos...</span>
                case 'output-available':
                    const matches = []
                    let match
                    regexLibrary.lastIndex = 0 // Reset regex state
                    while ((match = regexLibrary.exec(part.output)) !== null) {
                        matches.push(match[1].trim())
                    }
                    if (matches.length === 1)
                        return <span className="text-secondary">Consultei documento da biblioteca: {matches[0]}</span>
                    else if (matches.length > 1)
                        return <span className="text-secondary">Consultei documentos da biblioteca: {matches.join(', ')}</span>
                    else
                        return null
                case 'output-error':
                    return <div>Error: {part.errorText}</div>;
            }
        case 'tool-getPrecedent':
            switch (part.state) {
                case 'input-streaming':
                    return <span className="text-secondary">Acessando dados de precedentes...</span>
                case 'input-available':
                    return <span className="text-secondary">Obtendo dados de precedentes: {part.input?.searchQuery}...</span>
                case 'output-available':
                    return <span className="text-secondary">Consultei dados de precedentes: {part.input?.searchQuery}</span>
                case 'output-error':
                    return <div>Error: {part.errorText}</div>;
            }
        case 'tool-getPangea':
            switch (part.state) {
                case 'input-streaming':
                    return <span className="text-secondary">Acessando dados do Pangea...</span>
                case 'input-available':
                    return <span className="text-secondary">Obtendo dados do Pangea: {part.input?.query}...</span>
                case 'output-available':
                    return <span className="text-secondary">Consultei dados do Pangea: {part.input?.query}</span>
                case 'output-error':
                    return <div>Error: {part.errorText}</div>;
            }
        case 'tool-getSemanticSearch':
            switch (part.state) {
                case 'input-streaming':
                    return <span className="text-secondary">Acessando busca semântica...</span>
                case 'input-available':
                    return <span className="text-secondary">Executando busca semântica: {part.input?.query}...</span>
                case 'output-available':
                    return <span className="text-secondary">Consultei busca semântica: {part.input?.query} e localizei: {joinWithAnd(part.output?.results?.map(i => i.title))}.</span>
                case 'output-error':
                    return <div>Error: {part.errorText}</div>;
            }
        case 'tool-getLeadingCaseSearch':
            switch (part.state) {
                case 'input-streaming':
                    return <span className="text-secondary">Acessando busca por processo paradigma...</span>
                case 'input-available':
                    return <span className="text-secondary">Buscando temas pelo processo paradigma: {part.input?.numero}...</span>
                case 'output-available':
                    return <span className="text-secondary">Consultei temas pelo processo paradigma: {part.input?.numero} e localizei: {joinWithAnd(part.output?.results?.map(i => `${i.tipo} ${i.nr} - ${i.orgao}`))}.</span>
                case 'output-error':
                    return <div>Error: {part.errorText}</div>;
            }
        default:
            return <span className="text-secondary">Ferramenta desconhecida: {part.type}</span>
    }
}

