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
                        <Form.Label className="mb-0">Nome</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.name} />
                    </Col>}
                    {prompt?.content?.author && <Col md={6}>
                        <Form.Label className="mb-0">Autor</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.author} />
                    </Col>}
                    {prompt?.content?.description && <Col md={12}>
                        <Form.Label className="mb-0">Descrição</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.description} />
                    </Col>}
                    {prompt?.content?.scope && <Col md={3}>
                        <Form.Label className="mb-0">Segmento</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.scope} />
                    </Col>}
                    {prompt?.content?.instance && <Col md={3}>
                        <Form.Label className="mb-0">Instância</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.instance} />
                    </Col>}
                    {prompt?.content?.matter && <Col md={3}>
                        <Form.Label className="mb-0">Natureza</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.matter} />
                    </Col>}
                    {prompt?.content?.phase && <Col md={3}>
                        <Form.Label className="mb-0">Fases Processuais</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.phase} />
                    </Col>}
                    {prompt?.content?.target && <Col md={3}>
                        <Form.Label className="mb-0">Alvo</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.target} />
                    </Col>}
                    {prompt?.content?.editor_label && <Col md={3}>
                        <Form.Label className="mb-0">Nome do Campo</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.editor_label} />
                    </Col>}
                    {prompt?.content?.piece_strategy && <Col md={3}>
                        <Form.Label className="mb-0">Seleção de Peças</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.piece_strategy} />
                    </Col>}
                    {prompt?.content?.piece_descr && <Col md={3}>
                        <Form.Label className="mb-0">Tipos de Peças</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.piece_descr} />
                    </Col>}
                    {prompt?.content?.profile && <Col md={3}>
                        <Form.Label className="mb-0">Perfil</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.profile} />
                    </Col>}
                    {prompt?.content?.summary && <Col md={3}>
                        <Form.Label className="mb-0">Resumir Selecionadas</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.content.summary} />
                    </Col>}
                    {prompt?.share && <Col md={3}>
                        <Form.Label className="mb-0">Compartilhamento</Form.Label>
                        <Form.Control className="form-control mb-3" readOnly defaultValue={prompt.share} />
                    </Col>}
                </Row>
                {prompt.content.template && (<Row className="mb-3">
                    <Col>
                        <Form.Label className="mb-0">Modelo</Form.Label>
                        <Form.Control className="form-control mb-3"
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
                        <Form.Label className="mb-0">Prompt</Form.Label>
                        <Form.Control className="form-control mb-3"
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
                            <Form.Label className="mb-0">Prompt de Sistema</Form.Label>
                            <Form.Control className="form-control mb-3"
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
                                <Form.Label className="mb-0">JSON Schema</Form.Label>
                                <Form.Control className="form-control mb-3"
                                    as="textarea"
                                    rows={10}

                                    readOnly
                                    defaultValue={prompt.content.json_schema}
                                />
                            </Col>
                        )}
                        {prompt.content.format && (
                            <Col md={12}>
                                <Form.Label className="mb-0">Format</Form.Label>
                                <Form.Control className="form-control mb-3"
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