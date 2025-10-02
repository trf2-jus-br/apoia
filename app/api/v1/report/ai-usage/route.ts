import { NextRequest, NextResponse } from 'next/server'
import { Dao } from '@/lib/db/mysql'
import { assertApiUser, isUserModerator } from '@/lib/user'
import { ApiError, BadRequestError, withErrorHandler } from '@/lib/utils/api-error'

async function POST_HANDLER(req: NextRequest) {
  const user = await assertApiUser()
  const isModerator = await isUserModerator(user)
  const { processes, cpfs, startDate, endDate, groupBy } = await req.json()
  if (!processes && !cpfs) {
    throw new BadRequestError('Informe processos ou CPFs')
  }
  let sanitizedProcesses: string[] | undefined = processes ? (Array.isArray(processes) ? processes : processes.split(',')).map(c => c.replace(/\D/g, '').trim()).filter(Boolean) : undefined
  let sanitizedCpfs: string[] | undefined = cpfs ? (Array.isArray(cpfs) ? cpfs : cpfs.split(',')).map(c => c.replace(/\D/g, '').trim()).filter(Boolean) : undefined

  if (!isModerator || !sanitizedCpfs || sanitizedCpfs.length === 0) {
    let userCpf = user?.corporativo?.[0]?.num_cpf || (user as any)?.cpf
    if (!userCpf) {
      const candidate = (user as any)?.preferredUsername || user?.name || ''
      const candidateDigits = candidate.replace(/\D/g, '')
      if (/^\d{11}$/.test(candidateDigits)) {
        userCpf = candidateDigits
      }
    }
    if (!userCpf) throw new ApiError('Usuário sem CPF cadastrado', 400)
    sanitizedCpfs = [String(userCpf).replace(/\D/g, '')]
  }

  const rows = await Dao.retrieveIAUsageReport({ processes: sanitizedProcesses, cpfs: sanitizedCpfs, startDate, endDate, groupBy: (isModerator && groupBy === 'user') ? 'user' : 'process' })
  return NextResponse.json({ rows })
}

export const POST = withErrorHandler(POST_HANDLER as any)
