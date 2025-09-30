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
  const connectives = ['de', 'da', 'das', 'do', 'dos']

  const words = breakIntoWords(text)

  let result = []
  let substitutions = 0

  while (words.length > 0) {
    while (words.length > 0 && !isValidFirstName(words[0])) {
      result.push(words.shift())
      continue
    }

    const names: string[] = []
    while (words.length > 0) {
      const current: string = words.shift()
      // Replace word with initial followed by period
      if (isValidName(current))
        names.push(current)
      else if (isWhiteSpaceOrSpecialChar(current))
        names.push(current)
      else if (words.length > 2 && connectives.includes(current.toLowerCase()) && isValidName(words[1]))
        names.push(current)
      else {
        words.unshift(current)
        break
      }
    }
    if (names.length > 0) {
      substitutions++
      // While names and with something that is not a isValidName, remove from names and unshift to words
      while (names.length > 0 && !isValidName(names[names.length - 1])) {
        const name = names.pop()
        if (name) words.unshift(name)
      }
      const formatedNames = names.filter(name => !/\s+/.test(name) && !connectives.includes(name.toLowerCase())).map(name => `${name[0]}.`)
      result.push(...formatedNames)
    }
  }
  return { text: result.join(''), substitutions }
}
