'use client'

import { useState } from 'react'
import { Row, Col, Card, CardBody, CardTitle, CardText, Button, Alert, Spinner, Table } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck, faPlug } from '@fortawesome/free-solid-svg-icons'
import { generateClaudeMcpConfig } from '@/lib/mcp/mcp-config'

type ToolMeta = { name: string, description: string }

export default function McpPage({ toolsList }: { toolsList: ToolMeta[] }) {
    const [url, setUrl] = useState<string>('')
    const [expiresAt, setExpiresAt] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | undefined>()
    const [copySuccess, setCopySuccess] = useState(false)

    const handleGenerate = async () => {
        setLoading(true)
        setError(undefined)
        try {
            const result = await generateClaudeMcpConfig()
            setUrl(result.url)
            setExpiresAt(result.expiresAt)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro ao gerar a URL de configuração.')
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = () => {
        if (!url) return
        navigator.clipboard.writeText(url).then(() => {
            setCopySuccess(true)
            setTimeout(() => setCopySuccess(false), 1500)
        }).catch((err) => {
            console.error('Erro ao copiar URL MCP: ', err)
        })
    }

    return (
        <>
            <h1 className="mb-4">
                MCP - Model Context Protocol
            </h1>

            <Row className="g-4">
                {/* O que é MCP */}
                <Col md={12}>
                    <Card>
                        <CardBody>
                            <CardTitle as="h5">O que é MCP</CardTitle>
                            <CardText>
                                O <strong>Model Context Protocol (MCP)</strong> é um padrão aberto que permite que
                                assistentes de IA - como o Claude - acessem ferramentas externas de forma segura.
                                O Apoia expõe suas ferramentas de pesquisa processual, jurisprudência e biblioteca
                                através de um servidor MCP, para que você possa usá-las diretamente no seu cliente
                                de IA preferido.
                            </CardText>
                            <CardText className="mb-0 text-body-secondary small">
                                Após configurar, as ferramentas do Apoia ficam disponíveis para o modelo, que pode
                                consultá-las automaticamente durante uma conversa.
                            </CardText>
                        </CardBody>
                    </Card>
                </Col>

                {/* Configurar no Claude */}
                <Col md={12}>
                    <Card>
                        <CardBody>
                            <CardTitle as="h5">Configurar no Claude</CardTitle>
                            <CardText className="text-body-secondary">
                                Gere a URL abaixo e informe-a no seu cliente MCP (ex.: no Claude Desktop,
                                ao adicionar um servidor MCP remoto do tipo HTTP).
                            </CardText>

                            {!url && <div className="mb-3">
                                <Button
                                    variant="primary"
                                    onClick={handleGenerate}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                                            Gerando...
                                        </>
                                    ) : 'Gerar URL'}
                                </Button>
                            </div>}

                            {error && (
                                <Alert variant="danger" className="mb-3">
                                    {error}
                                </Alert>
                            )}

                            {expiresAt && (
                                <Alert variant="warning" className="mb-3">
                                    <strong>Atenção:</strong> o token de acesso embutido nesta URL
                                    expira em <strong>{expiresAt}</strong>. Após esse horário, faça logout e login na Apoia e gere uma nova
                                    URL. O token é pessoal e deve ser tratado
                                    como uma senha - não o compartilhe.
                                </Alert>
                            )}

                            {url && (
                                <div className="position-relative">
                                    <pre className="bg-light p-3 rounded" style={{ maxHeight: '200px', overflow: 'auto', textAlign: 'center' }}>
                                        <code className="text-break" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{url}</code>
                                        <Button
                                            variant={copySuccess ? 'success' : 'outline-secondary'}
                                            size="sm"
                                            className="mt-3"
                                            onClick={handleCopy}
                                        >
                                            <FontAwesomeIcon icon={copySuccess ? faCheck : faCopy} className="me-1" />
                                            {copySuccess ? 'Copiado' : 'Copiar'}
                                        </Button>
                                    </pre>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </Col>
                {/* Tools disponíveis */}
                <Col md={12}>
                    <Card>
                        <CardBody>
                            <CardTitle as="h5">Ferramentas disponíveis</CardTitle>
                            <CardText className="text-body-secondary">
                                As seguintes ferramentas serão expostas ao cliente MCP:
                            </CardText>
                            <Table striped bordered hover responsive size="sm">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Descrição</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {toolsList.map((tool) => (
                                        <tr key={tool.name}>
                                            <td><code>{tool.name}</code></td>
                                            <td>{tool.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </>
    )
}
