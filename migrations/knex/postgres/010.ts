import { Knex } from 'knex';
import fs from 'fs';
import path from 'path';

export async function up(knex: Knex): Promise<void> {
  const sql = fs.readFileSync(path.resolve(__dirname, '../../postgres/migration-010.sql'), 'utf8');
  return knex.raw(sql);
}

export async function down(knex: Knex): Promise<void> {
  throw new Error('Downward migrations are not supported for this project.');
}
