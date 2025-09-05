import { ANY, ANY_EXCEPT, EXACT, OR, PHASE, match, Documento } from '../lib/proc/pattern'
import { matchFull } from '../lib/proc/pattern'
import { T } from '../lib/proc/combinacoes'

describe('match with phase markers', () => {
  const baseDocs = (tipos: T[]): Documento[] => tipos.map((tipo, i) => ({ id: String(i+1), tipo, numeroDoEvento: String(i+1), descricaoDoEvento: tipo }))

  test('apelação aberta phase', () => {
    const docs = baseDocs([T.PETICAO_INICIAL, T.APELACAO])
    const pattern = [
      ANY(),
      OR(T.APELACAO, T.RECURSO, T.RECURSO_INOMINADO),
      PHASE('APELACAO_ABERTA'),
      ANY_EXCEPT(T.VOTO, T.ACORDAO)
    ]
  const r = matchFull(docs, pattern)
    expect(r).not.toBeNull()
    expect(r!.lastPhase?.phase).toBe('APELACAO_ABERTA')
  })

  test('apelação fechada phase', () => {
    const docs = baseDocs([T.PETICAO_INICIAL, T.APELACAO, T.VOTO])
    const pattern = [
      ANY(),
      OR(T.APELACAO, T.RECURSO, T.RECURSO_INOMINADO),
      ANY(),
      OR(T.VOTO, T.ACORDAO),
      PHASE('APELACAO_FECHADA'),
      ANY()
    ]
  const r = matchFull(docs, pattern)
    expect(r).not.toBeNull()
    expect(r!.lastPhase?.phase).toBe('APELACAO_FECHADA')
  })

  test('prefer later phase marker when multiple', () => {
    const docs = baseDocs([T.PETICAO_INICIAL, T.APELACAO])
    const pattern = [
      ANY(undefined, 'EARLY'),
      OR(T.APELACAO),
      PHASE('LATE'),
      ANY_EXCEPT(T.VOTO)
    ]
  const r = matchFull(docs, pattern)
    expect(r).not.toBeNull()
    expect(r!.phasesMatched.map(p => p.phase)).toEqual(expect.arrayContaining(['EARLY','LATE']))
    expect(r!.lastPhase?.phase).toBe('LATE')
  })

  test('phase marker with no capture still works', () => {
    const docs = baseDocs([T.PETICAO_INICIAL])
    const pattern = [PHASE('INICIAL'), ANY()]
  const r = matchFull(docs, pattern)
    expect(r).not.toBeNull()
    expect(r!.lastPhase?.phase).toBe('INICIAL')
  })
})
