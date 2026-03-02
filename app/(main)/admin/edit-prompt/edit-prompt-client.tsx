'use client'

import { useState } from 'react'
import { Button, Container, Form, Table, Alert, Spinner, Card, InputGroup } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faSave, faCheck } from '@fortawesome/free-solid-svg-icons'
import { formatBrazilianDateTime } from '@/lib/utils/utils'

interface PromptVersion {
    id: number
    base_id: number
    name: string
    created_at: string
    created_by: number | null
    is_latest: number | boolean
    share: string
    kind: string
    slug?: string
}

interface Owner {
    id: number
    username: string
    name: string | null
    cpf: string | null
}

interface PromptInfo {
    base_id: number
    versions: PromptVersion[]
    owner: Owner | null
    latest: PromptVersion
}

export default function EditPromptClient() {
    const [baseId, setBaseId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [promptInfo, setPromptInfo] = useState<PromptInfo | null>(null)

    // Edit fields
    const [editKind, setEditKind] = useState('')
    const [editName, setEditName] = useState('')
    const [editSlug, setEditSlug] = useState('')

    // Save state
    const [saving, setSaving] = useState(false)

    const fetchPromptInfo = async () => {
        if (!baseId.trim()) {
            setError('Informe o base_id do prompt')
            return
        }

        setLoading(true)
        setError(null)
        setSuccess(null)
        setPromptInfo(null)

        try {
            const res = await fetch(`/api/v1/admin/prompt/${baseId.trim()}`)
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.errormsg || 'Erro ao buscar prompt')
            }
            const data = await res.json()
            setPromptInfo(data)
            setEditKind(data.latest.kind || '')
            setEditName(data.latest.name || '')
            setEditSlug(data.latest.slug || '')
        } catch (err: any) {
            setError(err.message || 'Erro ao buscar prompt')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!promptInfo) return
        if (!editName.trim()) {
            setError('O campo Nome e obrigatorio')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const res = await fetch(`/api/v1/admin/prompt/${promptInfo.base_id}/edit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kind: editKind,
                    name: editName.trim(),
                    slug: editSlug.trim()
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.errormsg || 'Erro ao salvar prompt')
            }

            const data = await res.json()
            setSuccess(`Prompt atualizado com sucesso. ${data.updated} registros atualizados.`)

            // Recarregar informacoes do prompt
            fetchPromptInfo()
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar prompt')
        } finally {
            setSaving(false)
        }
    }

    const hasChanges = promptInfo && (
        editKind !== (promptInfo.latest.kind || '') ||
        editName !== (promptInfo.latest.name || '') ||
        editSlug !== (promptInfo.latest.slug || '')
    )

    return (
        <Container className="mt-5">
            <h1 className="mb-4">Editar Prompt</h1>

            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* Search Prompt */}
            <Card className="mb-4">
                <Card.Header>Buscar Prompt</Card.Header>
                <Card.Body>
                    <Form onSubmit={(e) => { e.preventDefault(); fetchPromptInfo(); }}>
                        <InputGroup>
                            <Form.Control
                                type="number"
                                placeholder="Informe o base_id do prompt"
                                value={baseId}
                                onChange={(e) => setBaseId(e.target.value)}
                            />
                            <Button variant="primary" type="submit" disabled={loading}>
                                {loading ? <Spinner animation="border" size="sm" /> : <FontAwesomeIcon icon={faSearch} />}
                                <span className="ms-2">Buscar</span>
                            </Button>
                        </InputGroup>
                    </Form>
                </Card.Body>
            </Card>

            {/* Prompt Info */}
            {promptInfo && (
                <>
                    <Card className="mb-4">
                        <Card.Header>Informacoes do Prompt</Card.Header>
                        <Card.Body>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <strong>Base ID:</strong> {promptInfo.base_id}
                                </div>
                                <div className="col-md-6">
                                    <strong>Compartilhamento:</strong> {promptInfo.latest.share}
                                </div>
                            </div>
                            <div className="mb-3">
                                <strong>Dono:</strong>{' '}
                                {promptInfo.owner ? (
                                    <>
                                        [ID: {promptInfo.owner.id}] {promptInfo.owner.name || promptInfo.owner.username}
                                    </>
                                ) : (
                                    <span className="text-muted">Sem dono definido</span>
                                )}
                            </div>

                            <h6 className="mt-4">Versoes ({promptInfo.versions.length})</h6>
                            <Table striped bordered hover size="sm" responsive>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nome</th>
                                        <th>Data de Criacao</th>
                                        <th>Atual</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promptInfo.versions.map(version => (
                                        <tr key={version.id}>
                                            <td>{version.id}</td>
                                            <td>{version.name}</td>
                                            <td>{formatBrazilianDateTime(new Date(version.created_at))}</td>
                                            <td className="text-center">
                                                {Boolean(version.is_latest) && <FontAwesomeIcon icon={faCheck} className="text-success" />}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>

                    {/* Edit Fields */}
                    <Card className="mb-4">
                        <Card.Header>Editar Campos</Card.Header>
                        <Card.Body>
                            <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                                <Form.Group className="mb-3">
                                    <Form.Label><strong>Kind</strong></Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ex: analise, degravacao, ementa..."
                                        value={editKind}
                                        onChange={(e) => setEditKind(e.target.value)}
                                    />
                                    <Form.Text className="text-muted">
                                        Tipo do prompt. Deixe vazio para definir como nulo.
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label><strong>Name</strong></Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Nome do prompt"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label><strong>Slug</strong></Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Slug do prompt (gerado automaticamente se vazio)"
                                        value={editSlug}
                                        onChange={(e) => setEditSlug(e.target.value)}
                                    />
                                    <Form.Text className="text-muted">
                                        Identificador unico usado na URL. Se deixado vazio, sera gerado automaticamente a partir do nome.
                                    </Form.Text>
                                </Form.Group>

                                <div className="d-flex justify-content-end">
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        type="submit"
                                        disabled={saving || !hasChanges}
                                        title={!hasChanges ? 'Nenhuma alteracao detectada' : ''}
                                    >
                                        {saving ? (
                                            <Spinner animation="border" size="sm" />
                                        ) : (
                                            <FontAwesomeIcon icon={faSave} />
                                        )}
                                        <span className="ms-2">Salvar Alteracoes</span>
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </>
            )}
        </Container>
    )
}
