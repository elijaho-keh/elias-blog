// Creates the database tables from scripts/schema.sql.
// Run: npm run db:schema
//
// Uses the direct (unpooled) connection when it's available, as Neon
// recommends for schema changes.
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
const file = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');

// Remove -- comments, then split the file into separate statements
const statements = file
  .replace(/--.*$/gm, '')
  .split(';')
  .map((statement) => statement.trim())
  .filter((statement) => statement !== '');

await sql.transaction(statements.map((statement) => sql.query(statement)));
console.log(`Schema applied: ${statements.length} statements.`);
