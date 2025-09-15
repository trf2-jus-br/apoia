'use client'

import { IAPromptList } from "@/lib/db/mysql-types"
import TableRecords from "@/components/table-records"
import { Button, Form, FormGroup, FormLabel, FormSelect, Row } from "react-bootstrap"
import { useEffect, useState } from "react"
import { enumSorted } from "@/lib/ai/model-types"
import { Instance, Matter, Scope } from "@/lib/proc/process-types"

export default function PromptsTable({ prompts, onClick, onProcessNumberChange, children }: { prompts: IAPromptList[], onClick: (kind: string, row: any) => void, onProcessNumberChange: (number: string) => void, children: any }) {
    // prompts.sort((a, b) => {
    //     if (a.is_favorite !== b.is_favorite)
    //         return b.is_favorite - a.is_favorite;
    //     return a.id - b.id
    // })

    // Replace the return statement below with this updated JSX
    return (
        <>
            {/* <div className="mb-3">
                <FormSelect value={filter} onChange={handleFilterChange} className="form-select w-auto">
                    <option value="all">Todos</option>
                    <option value="favorites">Favoritos</option>
                    <option value="non-favorites">Não Favoritos</option>
                </FormSelect>
            </div> */}
            < TableRecords records={prompts} spec="Prompts" pageSize={20} onClick={onClick} >
                {children}
            </TableRecords >
        </>
    )
    return <TableRecords records={prompts} spec="Prompts" pageSize={20} onClick={onClick}>
        <div className="col col-auto">
            <Button variant="primary" href="/prompts/prompt/new">Criar Novo Prompt</Button>
        </div>
    </TableRecords>
}
