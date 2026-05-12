import { removeAccents } from '../utils/utils'
import commonFirstNames from './common-first-names.json'
import commonLastNames from './common-last-names.json'

const firstNameSet = new Set(commonFirstNames.map(name => name.toLowerCase()))

// Break a long string into words or special characters and whitespaces and return an array of them
function breakIntoWords(text: string): string[] {
  const regex = /([A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇa-zaàáâãäåèéêëìíîïòóôõöùúûüç]+|\s+|[\S])/g
  return text.match(regex) || []
}

// Function to check if a word is a valid first name
const isValidFirstName = (name: string): boolean => {
  if (!isValidName(name)) return false
  return firstNameSet.has(name.toLowerCase())
}

// A valid name should starts with a capital letter and be followed by other letters
const isValidName = (name: string): boolean => {
  return /^[A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ][A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇa-zaàáâãäåèéêëìíîïòóôõöùúûüç]+$/.test(name)
}

const isWhiteSpaceOrSpecialChar = (word: string): boolean => {
  return (/^\s+$/.test(word))
}

/**
 * Anonymizes Brazilian names in text by replacing them with initials 
 * @param text The text to anonymize
 * @param commonFirstNames Array of common Brazilian first names
 * @returns The anonymized text
 */
export function anonymizeNames(text: string): { text: string; substitutions: number } {
  // Brazilian name connectives
  const connectives = new Set(['de', 'da', 'das', 'do', 'dos'])

  const words = breakIntoWords(text)
  const result: string[] = []
  let substitutions = 0
  let i = 0

  while (i < words.length) {
    // Skip tokens that are not a valid first name
    if (!isValidFirstName(words[i])) {
      result.push(words[i++])
      continue
    }

    // Collect a name sequence starting at i using a lookahead index j
    const nameTokens: string[] = []
    let j = i

    while (j < words.length) {
      const current = words[j]
      if (isValidName(current)) {
        nameTokens.push(current)
        j++
      } else if (isWhiteSpaceOrSpecialChar(current)) {
        nameTokens.push(current)
        j++
      } else if (
        j + 2 < words.length &&
        connectives.has(current.toLowerCase()) &&
        isValidName(words[j + 2])
      ) {
        nameTokens.push(current)
        j++
      } else {
        break
      }
    }

    // Trim trailing non-name tokens, walking j back for each one removed
    while (nameTokens.length > 0 && !isValidName(nameTokens[nameTokens.length - 1])) {
      nameTokens.pop()
      j--
    }

    substitutions++
    const formatedNames = nameTokens
      .filter(name => !/\s+/.test(name) && !connectives.has(name.toLowerCase()))
      .map(name => `${name[0]}.`)
    result.push(...formatedNames)
    i = j
  }

  return { text: result.join(''), substitutions }
}
