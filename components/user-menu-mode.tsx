'use client'

import { useRouter } from "next/navigation"
import { useState } from "react"
import { setMode } from "@/app/(main)/prefs/actions"
import { ModeKey } from "@/lib/ai/prompt-types"

export default function UserMenuMode({ mode: initial }: { mode: ModeKey }) {
    const router = useRouter()
    const [isAdministrative, setIsAdministrative] = useState(initial === 'ADMINISTRATIVO')

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked
        setIsAdministrative(checked)
        await setMode(checked ? 'ADMINISTRATIVO' : 'JUDICIAL')
        router.refresh()
    }

    return (
        <li>
            <div className="dropdown-item">
                <div className="form-check">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="administrativeCheck"
                        onChange={handleChange}
                        checked={isAdministrative}
                    />
                    <label className="form-check-label" htmlFor="administrativeCheck">
                        Gestão Administrativa
                    </label>
                </div>
            </div>
        </li>
    )
}
