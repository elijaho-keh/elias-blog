// The one place that talks to the Neon database.
// Used by the serverless functions in /api and by the scripts in /scripts.
//
// @neondatabase/serverless sends each query over HTTPS. That suits Vercel
// functions: there's no connection to open, keep alive or close between
// requests.
import { neon } from '@neondatabase/serverless';

let sql;

function getSql() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Add it to .env locally, or in Vercel → Settings → Environment Variables.');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

// Runs one parameterised query and returns the rows.
// Values always go in the params array and are referred to as $1, $2, …
// in the SQL text, so user input is never pasted into the query itself.
//   query('SELECT * FROM posts WHERE slug = $1', [slug])
export function query(text, params = []) {
  return getSql().query(text, params);
}

// Runs several queries as one transaction: either all succeed or none do.
//   transaction([['INSERT …', [a, b]], ['UPDATE …', [c]]])
export function transaction(queries) {
  const db = getSql();
  return db.transaction(queries.map(([text, params = []]) => db.query(text, params)));
}
