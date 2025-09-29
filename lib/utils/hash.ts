import { MD5, SHA256 } from 'crypto-js'
import { canonicalize } from 'json-canonicalize'

export function calcSha256(messages: any): string {
    return SHA256(canonicalize(messages)).toString()
}

export function calcMd5(messages: any): string {
    return MD5(canonicalize(messages)).toString()
}
