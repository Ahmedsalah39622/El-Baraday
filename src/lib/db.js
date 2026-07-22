import { Pool } from 'pg';

// Serverless-optimized PostgreSQL connection pool for Supabase
let pool = global._pgPool;

if (!pool) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5, // Keep pool under Supabase session limit (max 15)
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 3000,
  });
  global._pgPool = pool;
}

// In-Memory Query Cache (0ms response for repeated GET queries)
const queryCache = new Map();
const CACHE_TTL_MS = 5000; // 5 seconds cache TTL

export async function query(text, params = []) {
  const isReadQuery = text.trim().toUpperCase().startsWith('SELECT');
  const cacheKey = isReadQuery ? `${text}:${JSON.stringify(params)}` : null;

  // Serve from instant memory cache if valid
  if (isReadQuery && cacheKey && queryCache.has(cacheKey)) {
    const cached = queryCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }
  }

  try {
    const result = await pool.query(text, params);

    // Cache read queries for instant 0ms responses
    if (isReadQuery && cacheKey) {
      queryCache.set(cacheKey, { result, timestamp: Date.now() });
    } else {
      // Clear cache on write operations (INSERT, UPDATE, DELETE)
      queryCache.clear();
    }

    return result;
  } catch (err) {
    // Return stale cache if DB is temporarily unreachable
    if (cacheKey && queryCache.has(cacheKey)) {
      return queryCache.get(cacheKey).result;
    }

    return {
      rows: [],
      rowCount: 0,
      isFallback: true,
      error: err.message,
    };
  }
}

export async function transaction(queries) {
  queryCache.clear(); // Clear cache on transactions
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
    return [{ rows: [], isFallback: true }];
  }
}

export default pool;
