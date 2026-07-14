'use client'

import { useRouter } from "next/navigation"
import { useState } from "react"
import { setBetaTester } from "@/app/(main)/prefs/actions"

export default function UserMenuBetaTester({ isBetaTester: initial }: { isBetaTester: boolean }) {
    const router = useRouter()
    const [isBetaTester, setIsBetaTester] = useState(initial)

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked
        setIsBetaTester(checked)
        await setBetaTester(checked)
        router.refresh()
    }

    return (
        <li>
            <div className="dropdown-item">
                <div className="form-check">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="betaTesterCheck"
                        onChange={handleChange}
                        checked={isBetaTester}
                    />
                    <label className="form-check-label" htmlFor="betaTesterCheck">
                        Beta tester
                    </label>
                </div>
            </div>
        </li>
    )
}
