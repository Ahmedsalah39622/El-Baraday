import { Pool } from 'pg';

// Server-side PostgreSQL connection pool for API routes
// Uses DATABASE_URL from .env.local
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000, // 3s timeout for fast fallback
});

// Helper: execute a query with graceful fallback on connection failure
export async function query(text, params = []) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn(`⚠️ DB pool connection notice (${err.message}). Using local response.`);
    return {
      rows: [],
      rowCount: 0,
      isFallback: true,
      error: err.message,
    };
  }
}

// Helper: execute multiple queries in a transaction with fallback
export async function transaction(queries) {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const q of queries) {
        const result = await client.query(q.text, q.params);
        results.push(result);
      }
      await client.query('COMMIT');
      return results;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn(`⚠️ DB transaction notice (${err.message}). Using local response.`);
    return [{ rows: [], isFallback: true }];
  }
}

export default pool;
