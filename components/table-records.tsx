'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import {
    flexRender,
    PaginationState,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable,
    RowSelectionState,
    filterFns,
    FilterMeta
} from '@tanstack/react-table'
import { Table as BTable, Pagination, Form, Button } from 'react-bootstrap'
import tableSpecs from '@/lib/ui/table-specs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAdd } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { glob, link } from 'fs'
import { usePathname } from "next/navigation"

// customFilterFn moved inside the component to access state



const customFilterFn = (row: any, columnId: string, filterValue: any, addMeta: (meta: FilterMeta) => void): boolean => {
    const selecionadas = filterValue?.endsWith(' (selecionadas)')
    const value = filterValue?.replace(' (selecionadas)', '').trim() || ''
    // Apply text filter using the default includesString
    const matchesText = filterFns.includesString(row, columnId, value, addMeta)
    // If "apenasSelecionadas" is enabled, keep only selected rows that also match the text filter
    return selecionadas ? row.getIsSelected() && matchesText : matchesText
}


export default function Table({ records, spec, linkToAdd, linkToBack, pageSize, filter, setFilter, selectedIds, onSelectdIdsChanged, onClick, onFilteredChange, options, modalActions, children }: {
    records: any[], spec: string | any, linkToAdd?: string, linkToBack?: string, pageSize?: number, filter?: string | null, setFilter?: (s: string) => void,
    selectedIds?: string[], onSelectdIdsChanged?: (ids: string[]) => void, onClick?: (kind: string, row: any) => void, onFilteredChange?: (info: { count: number, rows: any[] }) => void, options?: any, modalActions?: { onClick: () => void }, children?: any
}) {
    const [currentPageSize, setCurrentPageSize] = useState(pageSize || 5)
    const [sorting, setSorting] = useState([])
    const [globalFilter, setGlobalFilter] = useState('')
    const pathname = usePathname()
    const { columns, thead, tr, tableClassName, theadClassName, pageSizes } = typeof (spec) === 'string' ? tableSpecs(pathname, onClick, options)[spec] : spec
    const [rowSelection, setRowSelection] = useState<RowSelectionState>(selectedIds ? selectedIds.reduce((acc, value) => ({ ...acc, [value]: true }), {}) : {})
    const [apenasSelecionadas, setApenasSelecionadas] = useState(options?.apenasSelecionadas || false)

    const table = useReactTable({
        data: records,
        columns,
        state: { sorting, globalFilter, rowSelection },
        enableRowSelection: true,
        enableMultiRowSelection: true,
        autoResetPageIndex: false,
        onRowSelectionChange: setRowSelection, //hoist up the row selection state to your own scope
        onSortingChange: setSorting,
        globalFilterFn: customFilterFn,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getRowId: row => row.id,
    })

    useEffect(() => {
        table.setPageSize(currentPageSize)
        table.setPageIndex(0)
    }, [currentPageSize, table])

    useEffect(() => {
        if (selectedIds)
            table.setRowSelection(selectedIds ? selectedIds.reduce((acc, value) => ({ ...acc, [value]: true }), {}) : {})
    }, [selectedIds, table])

    useEffect(() => {
        if (onSelectdIdsChanged) {
            const selected = Object.keys(rowSelection).reduce((acc, value) => rowSelection[value] ? [...acc, value] : acc, [] as string[])
            onSelectdIdsChanged(selected)
        }
    }, [rowSelection, onSelectdIdsChanged])

    // Atualiza o globalFilter da tabela de forma debounced: o input continua respondendo
    // instantaneamente, mas a recomputação das linhas filtradas só roda 200ms após parar de digitar
    useEffect(() => {
        const timer = setTimeout(() => {
            table.setGlobalFilter(`${filter ?? ''}${apenasSelecionadas ? ' (selecionadas)' : ''}`)
        }, 200)
        return () => clearTimeout(timer)
    }, [filter, apenasSelecionadas, table])

    // Reporta ao chamador a contagem pós-filtro (texto globalFilter) e as linhas resultantes.
    // Como o globalFilter só muda após o debounce acima, este callback dispara naturalmente
    // 200ms após o usuário parar de digitar — não a cada keystroke.
    // Dependemos apenas do count (primitivo estável): getFilteredRowModel().rows retorna uma
    // nova referência de array a cada render, o que geraria loop infinito como dependência.
    const filteredRowCount = table.getFilteredRowModel().rows.length
    const lastReported = useRef(filteredRowCount)
    useEffect(() => {
        if (filteredRowCount !== lastReported.current) {
            lastReported.current = filteredRowCount
            const rows = table.getFilteredRowModel().rows.map(r => r.original)
            onFilteredChange?.({ count: filteredRowCount, rows })
        }
    }, [filteredRowCount, onFilteredChange, table])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 'f') {
                e.preventDefault()
                document.getElementById('filter-input')?.focus()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <div>
            <table className={tableClassName || 'table table-sm table-striped'}>
                <caption className="visually-hidden">Registros</caption>
                <thead className={theadClassName || ''}>
                    {thead ? thead() : table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id} scope="col" className={(header.column.columnDef as any)?.className} style={(header.column.columnDef as any)?.style}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {tr
                        ? table.getRowModel().rows.map(row => {
                            const record = row.original;
                            return tr(record)
                        })
                        : table.getRowModel().rows.map(row => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className={(cell.column.columnDef as any)?.className} style={(cell.column.columnDef as any)?.style}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                </tbody>
            </table>
            <div className="row">
                {children}
                {linkToBack &&
                    <div className="col col-auto mt-3 mb-0">
                        <Link href={`${pathname}/${linkToBack}`} className="btn btn-light bt d-print-none">Voltar</Link>
                    </div>
                }
                {linkToAdd &&
                    <div className="col col-auto ms-auto mt-3 mb-0">
                        <Link href={`${pathname}/${linkToAdd}`} className="btn btn-light bt float-end d-print-none" aria-label="Adicionar novo registro"><FontAwesomeIcon icon={faAdd} /></Link>
                    </div>
                }
                {options?.apenasSelecionadas &&
                    <div className="col col-auto ms-auto mt-3 mb-0">
                        <div className="d-flex align-items-center gap-2 d-print-none">
                            <Button onClick={modalActions.onClick} variant='outline-secondary'>Árvore</Button>
                            <div className="btn-group" role="group" aria-label="Filtro de seleção">
                                <input
                                    type="radio"
                                    className="btn-check"
                                    name="filtro-selecao"
                                    id="radio-todas"
                                    autoComplete="off"
                                    checked={!apenasSelecionadas}
                                    onChange={() => setApenasSelecionadas(false)}
                                />
                                <label className="btn btn-outline-secondary" htmlFor="radio-todas">
                                    Listar Todas
                                </label>

                                <input
                                    type="radio"
                                    className="btn-check"
                                    name="filtro-selecao"
                                    id="radio-selecionadas"
                                    autoComplete="off"
                                    checked={apenasSelecionadas}
                                    onChange={() => setApenasSelecionadas(true)}
                                />
                                <label className="btn btn-outline-secondary" htmlFor="radio-selecionadas">
                                    Selecionadas
                                </label>
                            </div>
                        </div>
                    </div>
                }
                {setFilter &&
                    <div className={`col col-auto mt-3 mb-0 ${options?.apenasSelecionadas ? '' : 'ms-auto'}`}>
                        <input
                            id="filter-input"
                            list="filter-options"
                            value={filter}
                            onChange={e => { setFilter(String(e.target.value)) }}
                            placeholder="Filtrar... (Alt+F)"
                            aria-label="Filtrar registros"
                            className="form-control" style={{ width: '8em' }}
                        />
                        <datalist id="filter-options">
                            <option value="selecionada" />
                        </datalist>
                    </div>
                }
                <div className="col mt-3 mb-0 flex-grow-1 p-0" />
                {(pageSizes && Array.isArray(pageSizes) && pageSizes.length > 0 && (table.getPageCount() > 1 || currentPageSize !== pageSizes?.[0])) && (
                    <div className="col col-auto mt-3 mb-0">
                        <Form.Select
                            value={currentPageSize}
                            onChange={e => setCurrentPageSize(Number(e.target.value))}
                            aria-label="Itens por página"
                            className="d-print-none"
                        >
                            {pageSizes.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </Form.Select>
                    </div>
                )}
                {(table.getState().pagination.pageIndex > 0 || table.getPageCount() > 1) && <div className="col col-auto mt-3 mb-0">
                    <Pagination className='mb-0'>
                        <Pagination.First onClick={() => table.firstPage()}
                            disabled={!table.getCanPreviousPage()} />
                        <Pagination.Prev onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()} />
                        <Pagination.Item> Página {table.getState().pagination.pageIndex + 1} de{' '}
                            {table.getPageCount()}</Pagination.Item>
                        <Pagination.Next onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()} />
                        <Pagination.Last onClick={() => table.lastPage()}
                            disabled={!table.getCanNextPage()} />
                    </Pagination>
                </div>}
            </div>
        </div>
    )
}