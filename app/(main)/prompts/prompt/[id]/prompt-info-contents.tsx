'use server'

import { Col, Container, Form, Row, Spinner } from 'react-bootstrap'
import { IAPrompt } from '@/lib/db/mysql-types'
import Link from 'next/link'

export default async function PromptInfoContents({ prompt, isModerator }: { prompt: IAPrompt, isModerator: boolean }) {
    return (
        <Container className="mt-3" fluid={false}>
            <Form>
                <Row className="mb-3">
                    {prompt?.name && <Col md={6}>
                        <Form.Label>Nome</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.name} />
                    </Col>}
                    {prompt?.content?.author && <Col md={6}>
                        <Form.Label>Autor</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.author} />
                    </Col>}
                    {prompt?.content?.scope && <Col md={4}>
                        <Form.Label>Segmento</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.scope} />
                    </Col>}
                    {prompt?.content?.instance && <Col md={4}>
                        <Form.Label>Instância</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.instance} />
                    </Col>}
                    {prompt?.content?.matter && <Col md={4}>
                        <Form.Label>Natureza</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.matter} />
                    </Col>}
                </Row>
                <Row className="mb-3">
                    {prompt?.content?.target && <Col md={3}>
                        <Form.Label>Alvo</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.target} />
                    </Col>}
                    {prompt?.content?.editor_label && <Col md={3}>
                        <Form.Label>Nome do Campo</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.editor_label} />
                    </Col>}
                    {prompt?.content?.piece_strategy && <Col md={3}>
                        <Form.Label>Seleção de Peças</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.piece_strategy} />
                    </Col>}
                    {prompt?.content?.piece_descr && <Col md={3}>
                        <Form.Label>Tipos de Peças</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.piece_descr} />
                    </Col>}
                    {prompt?.content?.profile && <Col md={3}>
                        <Form.Label>Perfil</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.profile} />
                    </Col>}
                </Row>
                <Row className="mb-3">
                    {prompt?.content?.summary && <Col md={2}>
                        <Form.Label>Resumir Selecionadas</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.content.summary} />
                    </Col>}
                    {prompt?.share && <Col md={2}>
                        <Form.Label>Compartilhamento</Form.Label>
                        <Form.Control className="form-control" readOnly defaultValue={prompt.share} />
                    </Col>}
                </Row>
                {prompt.content.template && (<Row className="mb-3">
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
                            <Col md={12}>
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
                            <Col md={12}>
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
                    <Link prefetch={false} href={`/prompts/prompt/${prompt.id}/edit`} className="btn btn-danger">Editar como Moderador</Link>
                    <Link prefetch={false} href={`/prompts/prompt/${prompt.id}/set-private`} className="btn btn-danger ms-2">Tornar Privado</Link>
                    <Link prefetch={false} href={`/prompts/prompt/${prompt.id}/set-unlisted`} className="btn btn-danger ms-2">Tornar Não Listado</Link>
                    <Link prefetch={false} href={`/prompts/prompt/${prompt.id}/set-public`} className="btn btn-danger ms-2">Tornar Público</Link>
                    <Link prefetch={false} href={`/prompts/prompt/${prompt.id}/set-standard`} className="btn btn-danger ms-2">Tornar Padrão</Link>
                </div>)
            }
        </Container>
    )
}