import ms from 'ms'
import React from 'react'

export const timeAgo = (timestamp: Date, timeOnly?: boolean): string => {
  if (!timestamp) return 'never'
  return `${ms(Date.now() - new Date(timestamp).getTime())}${timeOnly ? '' : ' ago'
    }`
}

export const primeiroEUltimoNome = (nome: string): string => {
  const partes = nome.split(' ')
  if (partes.length === 1) return nome
  return partes[0] + ' ' + partes[partes.length - 1]
}

export const maiusculasEMinusculas = (s) => {
  if (!s) return s

  const splited = s.split(' - ', 2)
  if (splited.length > 1) {
    return maiusculasEMinusculas(splited[0]) + ' - ' + splited[1]
  }

  let sb = "";
  let f = true;

  for (let i = 0; i < s.length; i++) {
    const ch = s.substring(i, i + 1);
    if (ch.toUpperCase() !== ch.toLowerCase()) {
      if (f) {
        sb += ch.toUpperCase();
        f = false;
      } else {
        sb += ch.toLowerCase();
      }
    } else {
      sb += ch;
      f = true;
    }
  }

  s = sb;

  s = s.replace(" E ", " e ");
  s = s.replace(" Da ", " da ");
  s = s.replace(" Das ", " das ");
  s = s.replace(" De ", " de ");
  s = s.replace(" Do ", " do ");
  s = s.replace(" Dos ", " dos ");

  return s;
}

export const isAllCaps = (s: string): boolean => {
  return s === s.toUpperCase();
}

export const joinWithAnd = (arr: string[]): string => {
  if (arr.length === 0) return ''
  if (arr.length === 1) return arr[0]
  if (arr.length === 2) return `${arr[0]} e ${arr[1]}`

  const lastItem = arr[arr.length - 1]
  const itemsExceptLast = arr.slice(0, -1)

  return `${itemsExceptLast.join(', ')} e ${lastItem}`
}

export const joinReactElementsWithAnd = (elements: React.ReactElement[]): React.ReactNode => {
  if (!elements || elements.length === 0) {
    return null
  }

  if (elements.length === 1) {
    return elements[0]
  }

  return elements.reduce((acc, curr, index) => {
    if (index === 0) {
      return [curr]
    }

    if (index === elements.length - 1) {
      return [...acc, ' e ', curr]
    }

    return [...acc, ', ', curr]
  }, [] as React.ReactNode[])
}


export const getNumberOfDaysInMonth = (year: number, month: number): number => {
  // Create a new Date object with the given year and month (months are zero-based)
  const date = new Date(year, month - 1, 1);

  // Get the last day of the month by subtracting one day from the first day of the next month
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  // Return the day component of the last day, which gives the number of days in the month
  return lastDay.getDate();
}


// Format date as YYYY-MM-DD HH:mm:ss
export const formatDate = (date: Date): string =>
  date ? date.toISOString().replace('T', ' ').replace(/\..+/, '') : ''


export const convertBrazilianValueToNumber = (value) => {
  if (typeof value === 'string') {
    value = value.replace(/\./g, '').replace(',', '.')
  }
  return value
}

export const slugify = (str: string): string => {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, remove numbers etc
  const from = "àáäâãèéëêìíïîòóöôõùúüûñç·/_,:;";
  const to = "aaaaaeeeeiiiiooooouuuunc------";

  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars and numbers
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-') // collapse dashes
    .replace(/-+$/g, '') // remove trailing -
    .replace(/^-+/g, '') // remove leading -

  return str;
}

export const parseYYYYMMDDHHMMSS = (dataAjuizamento: any) => {
  let dt = new Date(
    dataAjuizamento.slice(0, 4),
    dataAjuizamento.slice(4, 6) - 1,
    dataAjuizamento.slice(6, 8),
    dataAjuizamento.slice(8, 10),
    dataAjuizamento.slice(10, 12),
    dataAjuizamento.slice(12, 14)
  )
  // dt.setTime(dt.getTime() - dt.getTimezoneOffset() * 60 * 1000)
  // dt.setTime(dt.getTime() - 3 * 60 * 1000)
  return dt
}

export const formatBrazilianDateTime = (dt: Date) => {
  // dt.setTime(dt.getTime() + dt.getTimezoneOffset() * 60 * 1000)
  return dt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', timeZoneName: 'short' })
}

export const formatBrazilianDate = (dt: Date) => {
  if (!dt) return ''
  if (typeof dt === 'string')
    dt = new Date(dt)
  return dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export const addBlockQuote = (str: string) => {
  const regex = /(<p[^>]+class="paragrafoComRecuo"[^>]*>.*?<\/p>)/gm
  const subst = `<blockquote>$1</blockquote>`
  const result = str.replace(regex, subst)
  return result
}

export const removeEmptyKeys = (payload: any) => {
  Object.keys(payload).forEach(key => {
    if (payload[key] === '') {
      delete payload[key]
    }
  })
}

export const intOrUndefined = (v: string | number | undefined): number | undefined => {
  if (typeof v === 'string') {
    return parseInt(v)
  }
  return v
}

// Remove accents, remove spaces, to camelcase, first letter lowercase
export const labelToName = (label: string) => {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\b\w/g, char => char.toUpperCase())
    .replace(/ /g, '')
    .replace(/^./, char => char.toLowerCase());
}

export const removeAccents = (s: string): string => {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}


export const obfuscateString = (str: string): string => {
  const trimmedStr = str.trim();
  if (!trimmedStr) {
    return '';
  }

  const words = trimmedStr.split(/\s+/);

  if (words.length === 1) {
    const word = words[0];
    // Rule: "first 3 letters, followed by asterics and the last 3 letters"
    // String.prototype.slice(beginIndex, endIndex)
    // String.prototype.slice(indexStart) (if negative, treated as sourceLength + indexStart)
    const firstPart = word.slice(0, 3);
    const lastPart = word.slice(-3); // Extracts the last 3 characters. If word.length < 3, it takes the whole word.

    return `${firstPart}***${lastPart}`;
  } else {
    // Rule: "first word complete and all other words should be replaced by 
    // the first letter, asteriscs and the last letter."
    const firstWord = words[0];
    const otherWordsObfuscated = words.slice(1).map(otherWord => {
      if (otherWord.length <= 1) { // Handles single character words and empty strings if they somehow pass through
        return `${otherWord}***${otherWord}`; // e.g. "A" -> "A***A"
      }
      return `${otherWord[0]}***${otherWord[otherWord.length - 1]}`; // e.g. "Name" -> "N***e"
    });

    return [firstWord, ...otherWordsObfuscated].join(' ');
  }
};

export function simpleHashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = 31 * h + str.charCodeAt(i);
    h |= 0; // Convert to 32bit integer
  }
  return h;
}

export const isValidCPF = (d: string): boolean => {
  if (d.length !== 11) return false;
  // reject sequences like 00000000000, 11111111111, etc.
  if (/^(\d)\1{10}$/.test(d)) return false;

  const nums = d.split('').map(ch => parseInt(ch, 10));
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += nums[i] * (10 - i);
  let rev = sum % 11;
  const dig1 = rev < 2 ? 0 : 11 - rev;
  if (dig1 !== nums[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += nums[i] * (11 - i);
  rev = sum % 11;
  const dig2 = rev < 2 ? 0 : 11 - rev;
  return dig2 === nums[10];
}