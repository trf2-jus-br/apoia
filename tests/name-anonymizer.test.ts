import { anonymizeNames } from '../lib/anonym/name-anonymizer'

describe('Name Anonymizer', () => {
  test('should preserve line breaks and punctuation', () => {
    expect(
      anonymizeNames('MARIA SILVA, RENATO MACHADO e JOAQUIM\nPEREIRA foram\nà festa com João.').text)
      .toBe('M.S., R.M. e J.P. foram\nà festa com J..')
  })

  test('should not confuse connectives with other words', () => {
    expect(
      anonymizeNames('José da Silva dos Santos demorou para ir ao médico.').text)
      .toBe('J.S.S. demorou para ir ao médico.')
  })

  test('should handle connectives in names', () => {
    expect(
      anonymizeNames('José da Silva dos Santos foi ao médico.').text)
      .toBe('J.S.S. foi ao médico.')
  })

  test('should anonymize single names', () => {
    expect(
      anonymizeNames('O paciente João relatou dor.').text)
      .toBe('O paciente J. relatou dor.')
  })

  test('should anonymize full names with last names', () => {
    expect(
      anonymizeNames('Maria Silva disse que estava bem.').text)
      .toBe('M.S. disse que estava bem.')
  })

  test('should understand the beggining of a name', () => {
    expect(
      anonymizeNames('Senhora Maria Silva disse que estava bem.').text)
      .toBe('Senhora M.S. disse que estava bem.')
  })

  test('should handle multiple names in text', () => {
    expect(
      anonymizeNames('João Pereira e Maria da Costa são amigos.').text)
      .toBe('J.P. e M.C. são amigos.')
  })

  test('should be accent sensitive', () => {
    expect(
      anonymizeNames('Maria da Silva e Mariá Barbosa.').text)
      .toBe('M.S. e Mariá Barbosa.')
  })

  test('should handle uppercase names', () => {
    expect(
      anonymizeNames('MARIA SILVA e JOAQUIM PEREIRA foram à festa.').text)
      .toBe('M.S. e J.P. foram à festa.')
  })

  test('should not anonymize only last names', () => {
    expect(
      anonymizeNames('Dr. Costa e Silva foi à festa.').text)
      .toBe('Dr. Costa e Silva foi à festa.')
  })

  test('should not change words that are not names', () => {
    expect(
      anonymizeNames('Casa grande tem muitos quartos.').text)
      .toBe('Casa grande tem muitos quartos.')
  })
})
