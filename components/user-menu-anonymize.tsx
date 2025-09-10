'use client'

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"


export default function UserMenuAnonymize() {
    const router = useRouter()
    const [isAnonymized, setIsAnonymized] = useState(false)

    useEffect(() => {
        setIsAnonymized(document.cookie.includes('anonymize=true'))
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked
        setIsAnonymized(checked)
        if (checked) {
            document.cookie = "anonymize=true;path=/;max-age=31536000"
        } else {
            document.cookie = "anonymize=false;path=/;max-age=0"
        }
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
