'use client'

import { useRouter } from "next/navigation"
import { useState } from "react"
import { setAnonymize } from "@/app/(main)/prefs/actions"

export default function UserMenuAnonymize({ isAnonymized: initial }: { isAnonymized: boolean }) {
    const router = useRouter()
    const [isAnonymized, setIsAnonymized] = useState(initial)

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked
        setIsAnonymized(checked)
        await setAnonymize(checked)
        router.refresh()
    }

    return (
        <li>
            <div className="dropdown-item">
                <div className="form-check">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="anonymizeCheck"
                        onChange={handleChange}
                        checked={isAnonymized}
                    />
                    <label className="form-check-label" htmlFor="anonymizeCheck">
                        Anonimizar
                    </label>
                </div>
            </div>
        </li>
    )
}
