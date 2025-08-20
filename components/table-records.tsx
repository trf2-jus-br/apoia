'use client'

import { useEffect, useState } from 'react'

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
import { Table as BTable, Pagination, Form } from 'react-bootstrap'
import tableSpecs from '@/lib/ui/table-specs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAdd } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { link } from 'fs'
import { usePathname } from "next/navigation"

const customFilterFn = (rows, columnId, filterValue, addMeta: (meta: FilterMeta) => void): boolean => {
    if (filterValue === 'selecionada') {
        return rows.getIsSelected()
    }
    return filterFns.includesString(rows, columnId, filterValue, addMeta)
}



export default function Table({ records, spec, linkToAdd, linkToBack, pageSize, selectedIds, onSelectdIdsChanged, onClick, options, children }: {
    records: any[], spec: string | any, linkToAdd?: string, linkToBack?: string, pageSize?: number,
    selectedIds?: string[], onSelectdIdsChanged?: (ids: string[]) => void, onClick?: (kind: string, row: any) => void, options?: any, children?: any
}) {
    const [currentPageSize, setCurrentPageSize] = useState(pageSize || 5)
    const [sorting, setSorting] = useState([])
    const [globalFilter, setGlobalFilter] = useState('')
    const pathname = usePathname()
    const { columns, thead, tr, tableClassName, theadClassName, pageSizes } = typeof (spec) === 'string' ? tableSpecs(pathname, onClick, options)[spec] : spec
    const [rowSelection, setRowSelection] = useState<RowSelectionState>(selectedIds ? selectedIds.reduce((acc, value) => ({ ...acc, [value]: true }), {}) : {})

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPageSize])

    useEffect(() => {
        if (selectedIds)
            table.setRowSelection(selectedIds ? selectedIds.reduce((acc, value) => ({ ...acc, [value]: true }), {}) : {})
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIds])

    useEffect(() => {
        if (onSelectdIdsChanged) {
            const selected = Object.keys(rowSelection).reduce((acc, value) => rowSelection[value] ? [...acc, value] : acc, [] as string[])
            onSelectdIdsChanged(selected)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rowSelection])

    return (
        <div>
            <table className={tableClassName || 'table table-sm table-striped'}>
                <thead className={theadClassName || ''}>
                    {thead ? thead() : table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id} style={(header.column.columnDef as any)?.style}>
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
                                    <td key={cell.id} style={(cell.column.columnDef as any)?.style}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                </tbody>
            </table>
            <div className="row">
                {children}
                <div className="col col-auto mb-0">
                    {linkToBack &&
                        <Link href={`${pathname}/${linkToBack}`} className="btn btn-light bt d-print-none">Voltar</Link>
                    }
                </div>
                <div className="col col-auto ms-auto mb-0">
                    {linkToAdd &&
                        <Link href={`${pathname}/${linkToAdd}`} className="btn btn-light bt float-end d-print-none"><FontAwesomeIcon icon={faAdd} /></Link>
                    }
                </div>
                <div className="col col-auto mb-0">
                    <input
                        list="filter-options"
                        value={globalFilter}
                        onChange={e => { setGlobalFilter(String(e.target.value)); table.setGlobalFilter(String(e.target.value)) }}
                        placeholder="Filtrar..."
                        className="form-control" style={{ width: '8em' }}
                    />
                    <datalist id="filter-options">
                        <option value="selecionada" />
                    </datalist>
                </div>
                {pageSizes && Array.isArray(pageSizes) && pageSizes.length > 0 && (
                    <div className="col col-auto mb-0">
                        <Form.Select
                            value={currentPageSize}
                            onChange={e => setCurrentPageSize(Number(e.target.value))}
                            className="d-print-none"
                        >
                            {pageSizes.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </Form.Select>
                    </div>
                )}
                <div className="col col-auto mb-0">
                    <Pagination className='mb-0'>
                        <Pagination.First onClick={() => table.firstPage()}
                            disabled={!table.getCanPreviousPage()} />
                        <Pagination.Prev onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()} />
                        <Pagination.Item> {table.getState().pagination.pageIndex + 1} of{' '}
                            {table.getPageCount()}</Pagination.Item>
                        <Pagination.Next onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()} />
                        <Pagination.Last onClick={() => table.lastPage()}
                            disabled={!table.getCanNextPage()} />
                    </Pagination>
                </div>
            </div>
        </div>
    )
}