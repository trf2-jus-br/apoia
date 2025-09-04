import Cryptr from "cryptr";

enum EnvPublicEnum {
    NEXTAUTH_URL_INTERNAL,
    NEXTAUTH_URL,

    JWT_ISSUER,
    JWT_AUDIENCE,

    COMPLETE_ANALYSIS_LIMIT,
    CONFIDENTIALITY_LEVEL_MAX,
    VERCEL,
    VERCEL_ENV,
    NODE_ENV,

    DB_CLIENT,
    DB_PORT,
    DB_USER,
    DB_DATABASE,
    DB_SSL,
    DB_POOL,

    KEYCLOAK_ISSUER,
    DATALAKE_API_URL,

    APP_CODE,
    APP_PORT,
    APP_REGISTRY_PORT,

    SYSTEMS,
    NAVIGATE_TO_PROCESS_URL,
    ACCESS_ARENA,
    MODEL,
    MNI_LIMIT,
    OCR_LIMIT,

    WOOTRIC_ACCOUNT_TOKEN,
    GOOGLE_ANALYTICS_ID,
}

enum EnvPrivateEnum {
    DB_HOST,
    DB_PASSWORD,
    NEXTAUTH_SECRET,
    NEXTAUTH_REPLACE_EMAIL_AND_PASSWORD,
    JWT_SECRET,
    PWD_SECRET,
    PROPERTY_SECRET,
    DATALAKE_TOKEN,
    DATALAKE_CLIENT_ID,
    DATALAKE_CLIENT_SECRET,
    KEYCLOAK_CREDENTIALS_SECRET,
    APP_HOST,
    APP_REGISTRY_HOST,
    TESTS_PATH,
    SAVE_PROMPT_RESULTS_PATH,
    OCR_URL,
    TIKA_URL,
    MODEL_ALLOWED_USERS,
}

type ParamType = { name: string, public: boolean }

const buildParamsList = () => {
    const params: ParamType[] = []

    for (const name in EnvPublicEnum) {
        if (isNaN(Number(name))) {
            params.push({ name, public: true });
        }
    }

    for (const name in EnvPrivateEnum) {
        if (isNaN(Number(name))) {
            params.push({ name, public: false });
        }
    }

    if (process.env.SYSTEMS) {
        const systems = process.env.SYSTEMS.split(',')
        for (const system of systems) {
            params.push({ name: `${system}_MNI_WSDL_URL`, public: false });
            params.push({ name: `${system}_MNI_ENDPOINT_URL`, public: false });
            params.push({ name: `${system}_VALIDATION_MESSAGE`, public: true });
            params.push({ name: `${system}_HASH_PASSWORD`, public: true });
        }
    }
    return params;
}

export const paramsList = buildParamsList()

const decryptedValueCache: { [key: string]: string } = {}

export const envString = (name: string): string | undefined => {
    if (process.env[`${name}_ENCRYPTED`] !== undefined) {
        if (decryptedValueCache[name]) return decryptedValueCache[name]
        const encryptedValue = process.env[`${name}_ENCRYPTED`]
        if (!encryptedValue) return undefined
        const cryptr = new Cryptr(envString('PROPERTY_SECRET') as string, {})
        const decrypted = cryptr.decrypt(encryptedValue)
        decryptedValueCache[name] = decrypted
        return decrypted
    }
    return process.env[name]
}

export const envNumber = (name: string): number | undefined => {
    const str = envString(name)
    if (str === undefined) return undefined
    const num = Number(str)
    return isNaN(num) ? undefined : num
}

export const isAllowedUser = (username: string, countId?: number): boolean => {
    const usernames = envStringPrefixed('MODEL_ALLOWED_USERS', countId ? `${countId}` : undefined)?.split(',')
    if (!usernames) return true // no restriction
    return usernames.includes(username)
}

export const envStringPrefixed = (key: string, seqTribunalPai: string): string => {
    let s: string
    if (seqTribunalPai)
        s = envString(`TRIBUNAL_${seqTribunalPai}_${key}`)
    if (!s)
        s = envString(key)
    return s
}

export const getEnvStringPrefixedIfUserIsAllowed = (username: string, key: string, seqTribunalPai?: string): string => {
    if (!isAllowedUser(username, seqTribunalPai ? Number(seqTribunalPai) : undefined)) return undefined
    const apiKey = envStringPrefixed(key, seqTribunalPai)
    if (!apiKey) return undefined
    return apiKey
}

export type System = {
    system: string,
    kind: string,
    api: string,
    wsdl: string,
    endpoint: string,
    validation: string,
    hashable: boolean
}
const systemsList = process.env.SYSTEMS?.split(',').map(system => system.trim()) || []

export const systems = systemsList.map(system => ({
    system,
    kind: process.env[`${system}_KIND`] as string,
    api: process.env[`${system}_API_URL`] as string,
    wsdl: process.env[`${system}_MNI_WSDL_URL`] as string,
    endpoint: process.env[`${system}_MNI_ENDPOINT_URL`] as string,
    validation: process.env[`${system}_VALIDATION_MESSAGE`] as string || 'Processo não encontrado',
    hashable: process.env?.[`${system}_HASH_PASSWORD`] === 'true'
} as System)) ?? new Array<System>

