import { formatDate } from "@/lib/utils/utils"
import { faStar, faUser } from "@fortawesome/free-regular-svg-icons"
import { faStar as faStarSolid, faUser as faUserSolid } from "@fortawesome/free-solid-svg-icons"
import { faCheck, faPlay } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Link from 'next/link'
import { Button, ButtonGroup, Dropdown, DropdownButton, Form } from "react-bootstrap"
import { Instance, Matter, Scope, Share } from "../proc/process-types"

const tableSpecs = (pathname: string, onClick: (kind: string, row: any) => void, options?: any) => {
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
                { header: 'Descrição', accessorKey: 'descricaoDoEvento', enableSorting: true, style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '10em' }, cell: data => <span title={data.row.original.descricaoDoEvento}>{data.row.original.descricaoDoEvento.toLowerCase()}</span> },
                { header: 'Rótulo', accessorKey: 'rotulo', enableSorting: true, style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '10em' }, cell: data => <a href={`/api/v1/process/${options?.dossierNumber}/piece/${data.row.original.id}/binary`} target="_blank" title={data.row.original.rotulo}>{data.row.original.rotulo.toLowerCase()}</a> },
                { header: 'Tipo', accessorKey: 'descr', enableSorting: true, style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '10em' }, cell: data => <span title={data.row.original.descr}>{data.row.original.descr.toLowerCase()}</span> },
                { header: 'Sigilo', accessorKey: 'sigilo', enableSorting: true, cell: data => <span>{data.row.original.sigilo}</span> },
            ],
            tableClassName: 'table table-sm table-striped table-warning',
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
                    header: ' ', accessorKey: '', style: { textAlign: "center", width: "1%" }, enableSorting: false, cell: data => data.row.original.is_favorite
                        ? <a href={`/community/prompt/${data.row.original.base_id}/reset-favorite`} className="text-primary"><FontAwesomeIcon className="me-1" icon={data.row.original.is_mine ? faUserSolid : faStarSolid} /></a>
                        : <a href={`/community/prompt/${data.row.original.base_id}/set-favorite`} className="text-secondary opacity-50"><FontAwesomeIcon className="me-1" icon={data.row.original.is_mine ? faUser : faStar} /></a>
                },
                {
                    header: 'Prompt', accessorKey: 'name', enableSorting: true, cell: data => <>
                        <span className="text-primary" onClick={() => onClick('executar', data.row.original)}><u>{data.row.original.name}</u></span>
                        <Dropdown style={{ display: "inline" }}>
                            <Dropdown.Toggle as="a" className="m-1" id={data.row.original.name} />
                            <Dropdown.Menu>
                                <Dropdown.Item onClick={() => onClick('executar', data.row.original)}>Executar</Dropdown.Item>
                                <Dropdown.Item onClick={() => onClick('copiar', data.row.original)}>Copiar prompt</Dropdown.Item>
                                <Dropdown.Item onClick={() => onClick('copiar link para favoritar', data.row.original)}>Copiar link para adicionar aos favoritos</Dropdown.Item>
                                <Dropdown.Item href={`/community/prompt/${data.row.original.id}/edit`} disabled={!data.row.original.is_mine}>Editar</Dropdown.Item>
                                <Dropdown.Item href={`/community/prompt/new?copyFrom=${data.row.original.id}`}>Fazer uma cópia</Dropdown.Item>
                                <Dropdown.Item href={`/community/prompt/${data.row.original.base_id}`}>Informações sobre o prompt</Dropdown.Item>
                                <Dropdown.Item href={`/community/prompt/${data.row.original.base_id}/set-favorite`}>Adicionar aos favoritos</Dropdown.Item>
                                <Dropdown.Item href={`/community/prompt/${data.row.original.base_id}/reset-favorite`}>Remover dos favoritos</Dropdown.Item>
                                <Dropdown.Item href={`/community/prompt/${data.row.original.base_id}/remove`} disabled={!data.row.original.is_mine}>Remover</Dropdown.Item>
                                {/* <Dropdown.Item href="#/action-3">Ativar execução automática</Dropdown.Item>
                                <Dropdown.Item href="#/action-3">Desativar execução automática</Dropdown.Item> */}
                            </Dropdown.Menu>
                        </Dropdown>
                    </>
                },

                { header: 'Autor', accessorKey: 'content.author', enableSorting: true },
                { header: 'Segmento', accessorKey: 'content.scope', enableSorting: true, cell: data => data.row.original.content.scope?.length === Object.keys(Scope).length ? 'Todos' : data.row.original.content.scope?.map(i => Scope[i]?.acronym || 'Não Encontrado').join(', '), style: { textAlign: "center" } },
                { header: 'Instância', accessorKey: 'content.instance', enableSorting: true, cell: data => data.row.original.content.instance?.length === Object.keys(Instance).length ? 'Todas' : data.row.original.content.instance?.map(i => Instance[i]?.acronym || 'Não Encontrado').join(', '), style: { textAlign: "center" } },
                { header: 'Natureza', accessorKey: 'content.matter', enableSorting: true, cell: data => data.row.original.content.matter?.length === Object.keys(Matter).length ? 'Todas' : data.row.original.content.matter?.map(i => Matter[i]?.acronym || 'Não Encontrado').join(', '), style: { textAlign: "center" } },
                { header: 'Compart.', accessorKey: 'share', enableSorting: true, cell: data => Share[data.row.original.share]?.descr || 'Não Encontrado', style: { textAlign: "center" } },
                { header: 'Estrelas', accessorKey: 'favorite_count', enableSorting: true, style: { textAlign: "right" } },
            ],
            tableClassName: 'table table-striped table-border-sides'
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
