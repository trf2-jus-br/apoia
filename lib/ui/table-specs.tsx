import { formatBrazilianDateTime, formatDate } from "@/lib/utils/utils"
import { faPenToSquare, faHeart, faUser, faStar } from "@fortawesome/free-regular-svg-icons"
import { faCheck, faPlay, faRotateRight, faHeart as faHeartSolid, faStop, faUser as faUserSolid, faGlobe } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Link from 'next/link'
import { Button, ButtonGroup, Dropdown, DropdownButton, Form } from "react-bootstrap"
import { Instance, Matter, Scope, Share } from "../proc/process-types"
import { formatDateTime, formatDuration } from "../utils/date"
import { RatingCell } from "@/components/RatingCell"
import devLog from "../utils/log"
import { wrapTitle } from "@/app/(main)/prompts/components/PromptButton"
import { useModeUrl } from "../utils/use-mode-url"


const tableSpecs = (pathname: string, onClick: (kind: string, row: any) => void, options?: any) => {
    const modeUrl = useModeUrl()
    // Prefixo de modo ("/adm") presente na URL corrente; links para APIs
    // sensíveis ao modo (ex.: binary de peça) precisam mantê-lo.
    return {
        ChoosePieces: {
            columns: [
                {
                    id: 'select-col',
                    header: ({ table }) => (
                        <Form.Check
                            checked={table.getIsAllRowsSelected()}
                            // indeterminate={table.getIsSomeRowsSelected()}
                            onChange={table.getToggleAllRowsSelectedHandler()} //or getToggleAllPageRowsSelectedHandler
                        />
                    ),
                    cell: ({ row }) => (
                        <Form.Check
                            checked={row.getIsSelected()}
                            // disabled={!row.getCanSelect()}
                            onChange={row.getToggleSelectedHandler()}
                        />
                    ),
                },
                { header: 'Evento', accessorKey: 'numeroDoEvento', enableSorting: true },
                { header: 'Descrição', accessorKey: 'descricaoDoEvento', enableSorting: true, className: 'd-none d-lg-table-cell', style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '10em' }, cell: data => <span title={data.row.original.descricaoDoEvento}>{data.row.original.descricaoDoEvento.toLowerCase()}</span> },
                { header: 'Rótulo', accessorKey: 'rotulo', enableSorting: true, style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '10em' }, cell: data => <a href={modeUrl(`/api/v1/process/${data.row.original.numeroDoProcesso || options?.dossierNumber}/piece/${data.row.original.id}/binary`)} target="_blank" title={data.row.original.rotulo}>{data.row.original.rotulo.toLowerCase()}</a> },
                { header: 'Tipo', accessorKey: 'descr', enableSorting: true, style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '10em' }, cell: data => <span title={data.row.original.descr}>{data.row.original.descr.toLowerCase()}</span> },
                { header: 'Sigilo', accessorKey: 'sigilo', enableSorting: true, className: 'd-none d-lg-table-cell', cell: data => <span>{data.row.original.sigilo}</span> },
            ],
            tableClassName: 'table table-sm table-striped table-warning mb-0',
            pageSizes: [10, 20, 50, 100, 200, 500],
        },
        CountersByPromptKinds: {
            columns: [
                { header: 'Tipo', accessorKey: 'kind', enableSorting: true, cell: data => <Link href={`${pathname}/kind/${data.row.original.kind}`}>{data.row.original.kind?.toUpperCase()}</Link> },
                { header: 'Prompts', accessorKey: 'prompts', enableSorting: true, style: { textAlign: "right" }, cell: data => data.row.original.prompts || '' },
                { header: 'Conjuntos de Teste', accessorKey: 'testsets', enableSorting: true, style: { textAlign: "right" }, cell: data => data.row.original.testsets || '' },
            ],
        },
        Prompts: {
            columns: [
                {
                    id: 'acoes', header: <span className="visually-hidden">Ações</span>, accessorKey: '', style: { textAlign: "center", width: "1%" }, enableSorting: false, cell: data => {
                        const isFavorite = data.row.original.is_favorite;

                        return isFavorite
                            ? <button type="button" className="btn btn-link p-0 text-primary" aria-label={data.row.original.is_mine ? "Remover dos meus prompts" : "Remover dos favoritos"} onClick={() => onClick('favoritar', { base_id: data.row.original.base_id, uuid: data.row.original.uuid, action: 'reset' })}>
                                <FontAwesomeIcon className="me-1" icon={data.row.original.is_mine ? faUserSolid : faHeartSolid} />
                            </button>
                            : <button type="button" className="btn btn-link p-0 text-secondary opacity-50" aria-label={data.row.original.is_mine ? "Adicionar aos meus prompts" : "Adicionar aos favoritos"} onClick={() => onClick('favoritar', { base_id: data.row.original.base_id, uuid: data.row.original.uuid, action: 'set' })}>
                                <FontAwesomeIcon className="me-1" icon={data.row.original.is_mine ? faUser : faHeart} />
                            </button>
                    }
                },
                {
                    header: 'Prompt', accessorKey: 'name', enableSorting: true, cell: data => <>
                        <button type="button" className="btn btn-link p-0 text-primary" onClick={() => onClick('executar', data.row.original)} title={wrapTitle(data.row.original?.content?.description)}><u>{data.row.original.name}</u></button>
                        <Dropdown style={{ display: 'inline', cursor: 'pointer' }}>
                            <Dropdown.Toggle as="a" className="m-1" id={data.row.original.name} />
                            <Dropdown.Menu>
                                <Dropdown.Item onClick={() => onClick('executar', data.row.original)}>Executar</Dropdown.Item>
                                {!data.row.original.origin && <Dropdown.Item onClick={() => onClick('copiar', data.row.original)}>Copiar prompt</Dropdown.Item>}
                                <Dropdown.Item onClick={() => onClick('copiar link para favoritar', data.row.original)}>Copiar link para adicionar aos favoritos</Dropdown.Item>
                                {!data.row.original.origin && <Dropdown.Item href={modeUrl(`/prompts/prompt/${data.row.original.id}/edit`)} disabled={!data.row.original.is_mine && !options?.isModerator}>Editar</Dropdown.Item>}
                                {!data.row.original.origin && <Dropdown.Item href={modeUrl(`/prompts/prompt/new?copyFrom=${data.row.original.id}`)}>Fazer uma cópia</Dropdown.Item>}
                                <Dropdown.Item href={modeUrl(`/prompts/prompt/${data.row.original.uuid}`)}>Informações sobre o prompt</Dropdown.Item>
                                <Dropdown.Item href={modeUrl(`/prompts/prompt/${data.row.original.uuid}/set-favorite`)}>Adicionar aos favoritos</Dropdown.Item>
                                <Dropdown.Item href={modeUrl(`/prompts/prompt/${data.row.original.uuid}/reset-favorite`)}>Remover dos favoritos</Dropdown.Item>
                                {!data.row.original.origin && <Dropdown.Item href={modeUrl(`/prompts/prompt/${data.row.original.base_id}/remove`)} disabled={!data.row.original.is_mine}>Remover</Dropdown.Item>}
                            </Dropdown.Menu>
                        </Dropdown>
                    </>
                },

                { header: 'Autor', accessorKey: 'content.author', enableSorting: true },
                { header: 'Segmento', accessorKey: 'content.scope', enableSorting: true, cell: data => data.row.original.content.scope?.length === Object.keys(Scope).length ? 'Todos' : data.row.original.content.scope?.map(i => Scope[i]?.acronym || 'Não Encontrado').join(', '), style: { textAlign: "center" } },
                { header: 'Instância', accessorKey: 'content.instance', enableSorting: true, cell: data => data.row.original.content.instance?.length === Object.keys(Instance).length ? 'Todas' : data.row.original.content.instance?.map(i => Instance[i]?.acronym || 'Não Encontrado').join(', '), style: { textAlign: "center" } },
                { header: 'Natureza', accessorKey: 'content.matter', enableSorting: true, cell: data => data.row.original.content.matter?.length === Object.keys(Matter).length ? 'Todas' : data.row.original.content.matter?.map(i => Matter[i]?.acronym || 'Não Encontrado').join(', '), style: { textAlign: "center" } },
                { header: 'Compart.', accessorKey: 'share', enableSorting: true, cell: data => Share[data.row.original.share]?.descr || 'Não Encontrado', style: { textAlign: "center" } },

                // Interactive rating: mostra número ou estrela, clique abre widget de avaliação
                {
                    id: 'rating', header: <span title="Avaliação"><FontAwesomeIcon icon={faStar} aria-hidden="true" /><span className="visually-hidden">Avaliação</span></span>,
                    accessorKey: 'rating.avg_laplace',
                    enableSorting: true,
                    style: { textAlign: "center" },
                    cell: data => (
                        <RatingCell
                            promptBaseId={data.row.original.base_id}
                            rating={data.row.original.rating}
                            onRatingUpdate={(stats) => {
                                devLog('Rating atualizado:', stats)
                            }}
                        />
                    )
                },

                { id: 'favoritos', header: <span title="Favoritos"><FontAwesomeIcon icon={faHeart} aria-hidden="true" /><span className="visually-hidden">Favoritos</span></span>, accessorKey: 'favorite_count', enableSorting: true, style: { textAlign: "center" } },
            ],
            tableClassName: 'table table-striped table-border-sides mb-0'
        },
        PromptsByKind: {
            columns: [
                { header: 'Nome', accessorKey: 'name', enableSorting: true },
                { header: 'Data de Criação', accessorKey: 'created_at', enableSorting: true, style: { textAlign: "center", width: "15%" }, cell: data => <span>{formatDate(data.row.original.created_at)}</span> },
                { header: 'Oficial', accessorKey: 'official_at', enableSorting: true, style: { textAlign: "center", width: "15%" }, cell: data => <a href={`${pathname}/prompts/${data.row.original.slug}/${data.row.original.official_id}/edit`}>{formatDate(data.row.original.official_at)}</a> },
                { header: 'Última Modificação', accessorKey: 'modified_at', enableSorting: true, style: { textAlign: "center", width: "15%" }, cell: data => <a href={`${pathname}/prompts/${data.row.original.slug}/${data.row.original.modified_id}/edit`}>{formatDate(data.row.original.modified_at)}</a> },
                { header: 'Versões', accessorKey: 'versions', enableSorting: true, style: { textAlign: "right", width: "10%" }, cell: data => <a href={`${pathname}/prompts/${data.row.original.slug}`}>{data.row.original.versions}</a> },
            ]
        },
        TestsetsByKind: {
            columns: [
                { header: 'Nome', accessorKey: 'name', enableSorting: true },
                { header: 'Data de Criação', accessorKey: 'created_at', enableSorting: true, style: { textAlign: "center", width: "15%" }, cell: data => <span>{formatDate(data.row.original.created_at)}</span> },
                { header: 'Oficial', accessorKey: 'official_at', enableSorting: true, style: { textAlign: "center", width: "15%" }, cell: data => <a href={`${pathname}/testsets/${data.row.original.slug}/${data.row.original.official_id}/edit`}>{formatDate(data.row.original.official_at)}</a> },
                { header: 'Última Modificação', accessorKey: 'modified_at', enableSorting: true, style: { textAlign: "center", width: "15%" }, cell: data => <a href={`${pathname}/testsets/${data.row.original.slug}/${data.row.original.modified_id}/edit`}>{formatDate(data.row.original.modified_at)}</a> },
                { header: 'Versões', accessorKey: 'versions', enableSorting: true, style: { textAlign: "right", width: "10%" }, cell: data => <a href={`${pathname}/testsets/${data.row.original.slug}`}>{data.row.original.versions}</a> },
            ]
        },

        PromptsByKindAndSlug: {
            columns: [
                { header: 'Data e Hora', accessorKey: 'created_at', enableSorting: true, cell: data => <a href={`${pathname}/${data.row.original.id}/edit`}>{formatDate(data.row.original.created_at)}</a> },
                { header: 'Teste Padrão', accessorKey: 'testset_name', enableSorting: true, cell: data => <a href={`${pathname}/../prompts/${data.row.original.testset_id}`}>{data.row.original.testset_name}</a> },
                { header: 'Resultado', accessorKey: 'score', enableSorting: true },
                { header: 'Oficial', accessorKey: 'is_official', enableSorting: true, style: { textAlign: "right" }, cell: data => data.row.original.is_official ? <span><FontAwesomeIcon icon={faCheck} /></span> : '' },
            ]
        },

        TestsetsByKindAndSlug: {
            columns: [
                { header: 'Data e Hora', accessorKey: 'created_at', enableSorting: true, cell: data => <a href={`${pathname}/${data.row.original.id}/edit`}>{formatDate(data.row.original.created_at)}</a> },
                { header: 'Teste Padrão', accessorKey: 'testset_name', enableSorting: true, cell: data => <a href={`${pathname}/../testsets/${data.row.original.testset_id}`}>{data.row.original.testset_name}</a> },
                { header: 'Resultado', accessorKey: 'score', enableSorting: true },
                { header: 'Oficial', accessorKey: 'is_official', enableSorting: true, style: { textAlign: "right" }, cell: data => data.row.original.is_official ? <span><FontAwesomeIcon icon={faCheck} /></span> : '' },
            ]
        },

        Ranking: {
            columns: [
                { header: 'Coleção de Testes', accessorKey: 'testset_name', enableSorting: true, cell: data => <a href={`${pathname}/../testsets/${data.row.original.testset_slug}/${data.row.original.testset_id}/edit`}>{data.row.original.testset_name}</a> },
                { header: 'Prompt', accessorKey: 'prompt_name', enableSorting: true, cell: data => <a href={`${pathname}/../prompts/${data.row.original.prompt_slug}/${data.row.original.prompt_id}/edit`}>{data.row.original.prompt_name}</a> },
                { header: 'Modelo', accessorKey: 'model_name', enableSorting: true },
                { header: 'Nota %', accessorKey: 'score', enableSorting: true, style: { textAlign: "right" }, cell: data => <a href={`${pathname}/../test/${data.row.original.testset_id}/${data.row.original.prompt_id}/${data.row.original.model_id}`}>{(data.row.original.score).toFixed(1)}</a> },
            ]
        },
        ChooseLibrary: {
            columns: [
                {
                    id: 'select-col',
                    header: ({ table }) => (
                        <Form.Check
                            checked={table.getIsAllRowsSelected()}
                            onChange={table.getToggleAllRowsSelectedHandler()}
                        />
                    ),
                    cell: ({ row }) => (
                        <Form.Check
                            checked={row.getIsSelected()}
                            onChange={row.getToggleSelectedHandler()}
                        />
                    ),
                },
                {
                    header: 'Título',
                    accessorKey: 'title',
                    enableSorting: true,
                    cell: data => data.row.original.title
                },
                {
                    id: 'origem', header: 'Origem', enableSorting: false, style: { textAlign: "center" }, cell: data => {
                        const doc = data.row.original
                        if (doc.is_mine)
                            return <span title="Documento próprio"><FontAwesomeIcon icon={faUser} className="me-1" aria-hidden="true" />Meu</span>
                        if (doc.is_favorite)
                            return <span title="Documento de outro usuário, favoritado por você"><FontAwesomeIcon icon={faHeart} className="me-1" aria-hidden="true" />Favorito</span>
                        return <span title="Documento padrão da Apoia"><FontAwesomeIcon icon={faGlobe} className="me-1" aria-hidden="true" />Padrão</span>
                    }
                },
                {
                    header: 'Inclusão', accessorKey: 'inclusion', enableSorting: true, className: 'd-none d-lg-table-cell', style: { textAlign: "right" }, cell: data => {
                        const { IALibraryInclusionLabels } = require('@/lib/db/mysql-types');
                        return data.row.original.inclusion ? IALibraryInclusionLabels[data.row.original.inclusion] : IALibraryInclusionLabels.NAO;
                    }
                },
                { header: 'Contexto', accessorKey: 'context', enableSorting: true, className: 'd-none d-lg-table-cell', style: { textAlign: "right" }, cell: data => data.row.original.context ? (data.row.original.context.length > 50 ? data.row.original.context.substring(0, 50) + '...' : data.row.original.context) : '-' },
            ],
            tableClassName: 'table table-sm table-striped table-info mb-0',
            pageSizes: [10, 20, 50, 100],
        },
        Library: {
            columns: [
                {
                    id: 'acoes', header: <span className="visually-hidden">Ações</span>, accessorKey: '', style: { textAlign: "center", width: "1%" }, enableSorting: false, cell: data => {
                        const doc = data.row.original
                        const isFavorite = doc.is_favorite

                        return isFavorite
                            ? <button type="button" className="btn btn-link p-0 text-primary" aria-label={doc.is_mine ? "Remover dos meus documentos" : "Remover dos favoritos"} onClick={() => onClick('favoritar', { uuid: doc.uuid, action: 'reset' })}>
                                <FontAwesomeIcon className="me-1" icon={doc.is_mine ? faUserSolid : faHeartSolid} />
                            </button>
                            : <button type="button" className="btn btn-link p-0 text-secondary opacity-50" aria-label={doc.is_mine ? "Adicionar aos meus documentos" : "Adicionar aos favoritos"} onClick={() => onClick('favoritar', { uuid: doc.uuid, action: 'set' })}>
                                <FontAwesomeIcon className="me-1" icon={doc.is_mine ? faUser : faHeart} />
                            </button>
                    }
                },
                {
                    header: 'Título',
                    accessorKey: 'title',
                    enableSorting: true,
                    cell: data => {
                        const doc = data.row.original;
                        const title = doc.title || 'Sem título';
                        return (
                            <>
                                <Link href={`${pathname}/${doc.id}/edit`} className="text-primary">
                                    {title}
                                </Link>
                                <Dropdown style={{ display: "inline", cursor: 'pointer' }}>
                                    <Dropdown.Toggle as="a" className="m-1" id={`dropdown-${doc.id}`} />
                                    <Dropdown.Menu>
                                        <Dropdown.Item href={`${pathname}/${doc.id}/edit`}>{doc.is_mine ? 'Editar' : 'Visualizar'}</Dropdown.Item>
                                        <Dropdown.Item onClick={() => onClick('copiar link para compartilhar', doc)}>Copiar link para compartilhar</Dropdown.Item>
                                        {!doc.is_favorite && <Dropdown.Item href={modeUrl(`/library/${doc.uuid}/set-favorite`)}>Favoritar</Dropdown.Item>}
                                        {!!doc.is_favorite && <Dropdown.Item href={modeUrl(`/library/${doc.uuid}/reset-favorite`)}>Desfavoritar</Dropdown.Item>}
                                        {options?.isModerator && <>
                                            <Dropdown.Divider />
                                            <Dropdown.Item href={modeUrl(`/library/${doc.uuid}/set-standard`)} disabled={doc.share === 'PADRAO'}>Definir como Padrão</Dropdown.Item>
                                            <Dropdown.Item href={modeUrl(`/library/${doc.uuid}/set-public`)} disabled={doc.share === 'PUBLICO'}>Tornar Público</Dropdown.Item>
                                            <Dropdown.Item href={modeUrl(`/library/${doc.uuid}/set-unlisted`)} disabled={doc.share === 'NAO_LISTADO'}>Tornar Não Listado</Dropdown.Item>
                                            <Dropdown.Item href={modeUrl(`/library/${doc.uuid}/set-private`)} disabled={doc.share === 'PRIVADO'}>Tornar Privado</Dropdown.Item>
                                        </>}
                                    </Dropdown.Menu>
                                </Dropdown>
                            </>
                        );
                    }
                },
                {
                    header: 'Autor', accessorKey: 'author', enableSorting: true,
                },
                {
                    header: 'Tipo', accessorKey: 'kind', enableSorting: true, cell: data => {
                        const { IALibraryKindLabels } = require('@/lib/db/mysql-types');
                        return IALibraryKindLabels[data.row.original.kind];
                    }
                },
                {
                    header: 'Inclusão', accessorKey: 'inclusion', enableSorting: true, cell: data => {
                        const { IALibraryInclusionLabels } = require('@/lib/db/mysql-types');
                        return data.row.original.inclusion ? IALibraryInclusionLabels[data.row.original.inclusion] : IALibraryInclusionLabels.NAO;
                    }
                },
                { header: 'Contexto', accessorKey: 'context', enableSorting: true, cell: data => data.row.original.context ? (data.row.original.context.length > 50 ? data.row.original.context.substring(0, 50) + '...' : data.row.original.context) : '-' },
                {
                    header: 'Compart.', accessorKey: 'share', enableSorting: true, style: { textAlign: "center" }, cell: data => {
                        const { IALibraryShareLabels } = require('@/lib/db/mysql-types');
                        return IALibraryShareLabels[data.row.original.share] || 'Não Encontrado';
                    }
                },
                { id: 'favoritos', header: <span title="Favoritos"><FontAwesomeIcon icon={faHeart} aria-hidden="true" /><span className="visually-hidden">Favoritos</span></span>, accessorKey: 'favorite_count', enableSorting: true, style: { textAlign: "center" }, cell: data => Number(data.row.original.favorite_count || 0) },
            ],
            tableClassName: 'table table-striped table-border-sides mb-0',
            pageSizes: [10, 20, 50, 100],
        },

        Batch: {
            columns: [
                { header: 'Número', accessorKey: 'dossier_code', enableSorting: true },
                { header: 'Status', accessorKey: 'status_icon', enableSorting: true, style: { textAlign: "center" }, cell: data => data.row.original.status_icon },
                { header: 'Tentativas', accessorKey: 'attempts', enableSorting: true, style: { textAlign: "center" } },
                { header: 'Início', accessorKey: 'started_at', enableSorting: true, style: { textAlign: "center" }, cell: data => formatDateTime(data.row.original.started_at) },
                { header: 'Duração', accessorKey: 'duration_ms', enableSorting: true, style: { textAlign: "center" }, cell: data => formatDuration(data.row.original.duration_ms) },
                { header: 'Custo', accessorKey: 'cost', enableSorting: true, style: { textAlign: "right" } },
                { header: 'Erro', accessorKey: 'error_msg', enableSorting: true, style: { textAlign: "left", maxWidth: "24em" } },
                {
                    header: 'Ação', accessorKey: 'none', enableSorting: true, style: { textAlign: "right" }, cell: data => (<>
                        {data.row.original.status === 'PENDING' && <button type="button" className="btn btn-link p-0 text-primary" aria-label="Executar" onClick={() => onClick('play', data.row.original)}><FontAwesomeIcon icon={faPlay} className="me-2" /></button>}
                        {(data.row.original.status === 'READY' || data.row.original.status === 'ERROR') && <button type="button" className="btn btn-link p-0 text-primary" aria-label="Tentar novamente" onClick={() => onClick('retry', data.row.original)}><FontAwesomeIcon icon={faRotateRight} className="me-2" /></button>}
                        {data.row.original.status === 'RUNNING' && <button type="button" className="btn btn-link p-0 text-primary" aria-label="Parar" onClick={() => onClick('stop', data.row.original)}><FontAwesomeIcon icon={faStop} className="me-2" /></button>}
                    </>)
                }
            ],
            tableClassName: 'table table-sm table-striped table-border-sides mb-0',
            pageSizes: [10, 20, 50, 100, 200, 500],
        },
    }
}

export default tableSpecs



// thead: () => {
//     return (<tr>
//         <th>Identificador</th>
//         <th>Nome</th>
//         <th style={{ textAlign: 'right' }}>Versões</th>
//         <th style={{ textAlign: 'center' }}>Início</th>
//         <th style={{ textAlign: 'center' }}>Término</th>
//     </tr>)
// },
// tr: record => (<tr key={record.identifier} >
//     <td><a href={`/prompts/${record.identifier}`}>{record.identifier}</a><a href={`/record/${record.id}`}></a></td>
//     <td style={{ wordBreak: 'break-all' }}>{record.name}</td>
//     <td style={{ textAlign: 'right' }}>{record.qtd}</td>
//     <td style={{ textAlign: 'center' }}>{formatDate(record.first_date).substring(5, 10)}</td>
//     <td style={{ textAlign: 'center' }}>{formatDate(record.last_date).substring(5, 10)}</td>
// </tr>)
