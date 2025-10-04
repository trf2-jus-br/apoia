// Custom Migration Source lendo diretamente arquivos SQL.
import fs from 'node:fs'
import path from 'node:path'
import Knex from 'knex'
// @ts-ignore
import knexBase from '../knexfile'

class SqlMigrationSource {
    private dir: string
    constructor(dir: string) { this.dir = dir }
    async getMigrations() {
        if (!fs.existsSync(this.dir)) return []
        return fs.readdirSync(this.dir)
            .filter(f => /^migration-\d+\.sql$/i.test(f))
            .sort((a, b) => parseInt(a.match(/(\d+)/)![1]) - parseInt(b.match(/(\d+)/)![1]))
            .map(name => ({ name }))
    }
    getMigrationName(m: any) { return m.name }
    getMigration(m: any) {
        return {
            up: (knex: Knex.Knex) => {
                const sql = fs.readFileSync(path.join(this.dir, m.name), 'utf8')
                return knex.raw(sql)
            },
            down: async () => { throw new Error('Downward migrations not supported') }
        }
    }
}

let running: Promise<void> | undefined

export async function migrateIfNeeded() {
    if (running) return running
    if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') return
    if (process.env.MIGRATE_ON_START === '0') return // opt-out explícito
    const client = process.env.DB_CLIENT || knexBase.client
    if (!client) return
    const dialect = client === 'pg' ? 'postgres' : client === 'mysql2' ? 'mysql' : undefined
    if (!dialect) {
        console.error('[migrate] Dialeto não suportado:', client)
        return
    }
    const sqlDir = path.resolve(process.cwd(), 'migrations', dialect, 'knex')
    if (!fs.existsSync(sqlDir)) {
        console.error('[migrate] Diretório não encontrado:', sqlDir)
        return
    }
    const cfg: any = { ...knexBase, connection: { ...knexBase.connection } }
    if (process.env.SPRING_FLYWAY_USER) cfg.connection.user = process.env.SPRING_FLYWAY_USER
    if (process.env.SPRING_FLYWAY_PASSWORD) cfg.connection.password = process.env.SPRING_FLYWAY_PASSWORD
    if (process.env.DB_HOST) cfg.connection.host = process.env.DB_HOST
    const source = new SqlMigrationSource(sqlDir)
    const db = Knex(cfg)
    const start = Date.now()
    console.log(`[migrate] Iniciando migração de ${dialect} ...`)
    // Tipagem custom com cast para contornar diferença de versões/types do Knex
    running = (db.migrate.latest as any)({ migrationSource: source })
        .then(() => console.log('[migrate] OK em', Date.now() - start, 'ms'))
        .catch(err => {
            console.error('[migrate] Erro:', err?.message)
            process.exit(1)
        })
        .finally(() => db.destroy())
    return running
}

