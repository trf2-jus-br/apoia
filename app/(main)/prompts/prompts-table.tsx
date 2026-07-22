'use client'

import { IAPromptList } from "@/lib/db/mysql-types"
import TableRecords from "@/components/table-records"
import { Button } from "react-bootstrap"
import { usePromptContext } from "./hooks"

export default function PromptsTable({ prompts, onClick, onProcessNumberChange, isModerator, children }: { prompts: IAPromptList[], onClick: (kind: string, row: any) => void, onProcessNumberChange: (number: string) => void, isModerator: boolean, children: any }) {
    const { filtro } = usePromptContext()
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
            < TableRecords records={prompts} spec="Prompts" pageSize={20} onClick={onClick} options={{ isModerator }} filter={filtro}>
                {children}
            </TableRecords >
        </>
    )
}
