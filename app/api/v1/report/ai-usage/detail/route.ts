import { NextRequest, NextResponse } from 'next/server'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser, isUserModerator } from '@/lib/user'

export async function POST(req: NextRequest) {
  try {
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)
    const { dossier_code, user_cpf, startDate, endDate } = await req.json()

    if (!dossier_code) throw new Error('dossier_code é obrigatório')

    let effectiveUserCpf: string | undefined = undefined

    if (isModerator) {
      effectiveUserCpf = user_cpf ? String(user_cpf).replace(/\D/g, '') : undefined
    } else {
      // pega o cpf do usuário atual (similar à lógica do relatório principal)
      let userCpf = (user as any)?.corporativo?.[0]?.num_cpf || (user as any)?.cpf
      if (!userCpf) {
        const candidate = (user as any)?.preferredUsername || user?.name || ''
        const digits = candidate.replace(/\D/g, '')
        if (/^\d{11}$/.test(digits)) userCpf = digits
      }
      if (!userCpf) throw new Error('Usuário sem CPF cadastrado')
      effectiveUserCpf = String(userCpf).replace(/\D/g, '')
    }

    const rows = await Dao.retrieveIAUsageDetail({ dossier_code, user_cpf: effectiveUserCpf, startDate, endDate, isModerator, currentUserCpf: effectiveUserCpf })
    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
