import { Pool } from 'pg';

// Serverless-optimized PostgreSQL connection pool for Supabase with Fast Fail-Safe
let pool = global._pgPool;

if (!pool) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 800, // Fast fail-safe: max 800ms connection wait before fallback
    statement_timeout: 2000, // Max 2s query statement timeout
  });

  pool.on('error', (err) => {
    console.warn('⚠️ Quiet PostgreSQL pool background error (using fallback cache):', err.message);
  });

  global._pgPool = pool;
}

// In-Memory Query Cache with 1s TTL for real-time cross-device synchronization
const queryCache = new Map();
const CACHE_TTL_MS = 1000; // 1 second cache TTL to ensure instant cross-device updates

export async function query(text, params = []) {
  const isReadQuery = text.trim().toUpperCase().startsWith('SELECT');
  const cacheKey = isReadQuery ? `${text}:${JSON.stringify(params)}` : null;

  // Serve from instant memory cache if valid (within 1s)
  if (isReadQuery && cacheKey && queryCache.has(cacheKey)) {
    const cached = queryCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }
  }

  // Fast-Timeout Race: Execute query or fallback within 800ms if remote DB is sluggish
  const queryPromise = pool.query(text, params);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Fast DB Connection Timeout')), 800)
  );

  try {
    const result = await Promise.race([queryPromise, timeoutPromise]);

    // Cache read queries for 1s
    if (isReadQuery && cacheKey) {
      queryCache.set(cacheKey, { result, timestamp: Date.now() });
    } else {
      // Clear cache immediately on write operations (INSERT, UPDATE, DELETE)
      queryCache.clear();
    }

    return result;
  } catch (err) {
    // Return stale cache immediately if available
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
