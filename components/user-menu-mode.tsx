'use client'

import { usePathname, useRouter } from "next/navigation"

// O modo é derivado da URL (prefixo "/adm" = ADMINISTRATIVO, ver proxy.ts), então
// o toggle simplesmente navega para a mesma página com/sem o prefixo.
export default function UserMenuMode() {
    const router = useRouter()
    const pathname = usePathname()
    const isAdministrative = pathname === '/adm' || pathname.startsWith('/adm/')

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked)
            router.push(`/adm${pathname}`)
        else
            router.push(pathname.replace(/^\/adm/, '') || '/')
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
                        Modo SEI!
                    </label>
                </div>
            </div>
        </li>
    )
}
