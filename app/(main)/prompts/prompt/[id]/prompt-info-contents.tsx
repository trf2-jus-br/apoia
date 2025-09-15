'use server'

import { Col, Container, Form, Row, Spinner } from 'react-bootstrap'
import { IAPrompt } from '@/lib/db/mysql-types'

export default async function PromptInfoContents({ pPrompt, isModerator }: { pPrompt: Promise<IAPrompt>, isModerator: boolean }) {
    const prompt = await pPrompt

    return (
        <Container className="mt-3" fluid={false}>
            <Form>
                <Row className="mb-3">
                    <Col md={3}>
                        <Form.Label>Nome</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.name} />
                    </Col>
                    <Col md={3}>
                        <Form.Label>Autor</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.author} />
                    </Col>
                    <Col md={2}>
                        <Form.Label>Segmento</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.scope} />
                    </Col>
                    <Col md={2}>
                        <Form.Label>Instância</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.instance} />
                    </Col>
                    <Col md={2}>
                        <Form.Label>Natureza</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.matter} />
                    </Col>
                </Row>
                <Row className="mb-3">
                    <Col md={3}>
                        <Form.Label>Alvo</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.target} />
                    </Col>
                    <Col md={3}>
                        <Form.Label>Nome do Campo</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.editor_label} />
                    </Col>
                    <Col md={3}>
                        <Form.Label>Seleção de Peças</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.piece_strategy} />
                    </Col>
                    <Col md={3}>
                        <Form.Label>Tipos de Peças</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.piece_descr} />
                    </Col>
                </Row>
                <Row className="mb-3">
                    <Col md={2}>
                        <Form.Label>Resumir Selecionadas</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.summary} />
                    </Col>
                    <Col md={2}>
                        <Form.Label>Compartilhamento</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.share} />
                    </Col>
                </Row>
                {prompt.content.template !== undefined && (<Row className="mb-3">
                    <Col>
                        <Form.Label>Modelo</Form.Label>
                        <Form.Control className="form-control"
                            as="textarea"
                            rows={10}
                            readOnly
                            defaultValue={prompt.content.template}
                        />
                    </Col>
                </Row>
                )}
                {prompt.content.prompt && (<Row className="mb-3">
                    <Col>
                        <Form.Label>Prompt</Form.Label>
                        <Form.Control className="form-control"
                            as="textarea"
                            rows={10}

                            readOnly
                            defaultValue={prompt.content.prompt}
                        />
                    </Col>
                </Row>
                )}
                {prompt.content.system_prompt && (
                    <Row className="mb-3">
                        <Col>
                            <Form.Label>Prompt de Sistema</Form.Label>
                            <Form.Control className="form-control"
                                as="textarea"
                                rows={10}

                                readOnly
                                defaultValue={prompt.content.system_prompt}
                            />
                        </Col>
                    </Row>
                )}
                {(prompt.content.json_schema || prompt.content.format) && (
                    <Row className="mb-3">
                        {prompt.content.json_schema && (
                            <Col md={6}>
                                <Form.Label>JSON Schema</Form.Label>
                                <Form.Control className="form-control"
                                    as="textarea"
                                    rows={10}

                                    readOnly
                                    defaultValue={prompt.content.json_schema}
                                />
                            </Col>
                        )}
                        {prompt.content.format && (
                            <Col md={6}>
                                <Form.Label>Format</Form.Label>
                                <Form.Control className="form-control"
                                    as="textarea"
                                    rows={10}

                                    readOnly
                                    defaultValue={prompt.content.format}
                                />
                            </Col>
                        )}
                    </Row>
                )}
            </Form>
            {isModerator && (
                <div className="text-center mt-3">
                    <a href={`/prompts/prompt/${prompt.id}/set-private`} className="btn btn-danger ms-2">Tornar Privado</a>
                    <a href={`/prompts/prompt/${prompt.id}/set-unlisted`} className="btn btn-danger ms-2">Tornar Não Listado</a>
                    <a href={`/prompts/prompt/${prompt.id}/set-public`} className="btn btn-danger ms-2">Tornar Público</a>
                    <a href={`/prompts/prompt/${prompt.id}/set-standard`} className="btn btn-danger ms-2">Tornar Padrão</a>
                </div>)
            }
        </Container>
    )
}