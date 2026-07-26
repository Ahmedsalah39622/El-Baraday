import mysql from 'mysql2/promise';

// Serverless-optimized MySQL connection pool for Hostinger phpMyAdmin
let pool;

export function getPool() {
  if (!pool) {
    if (global._mysqlPool) {
      pool = global._mysqlPool;
    } else {
      const config = {
        host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
        user: process.env.MYSQL_USER || process.env.DB_USER || 'u407531143_bara',
        password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || 'Q+x;s3r=n9',
        database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'u407531143_bara',
        port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000,
      };

      if (process.env.MYSQL_SSL === 'true') {
        config.ssl = { rejectUnauthorized: false };
      }

      pool = mysql.createPool(config);
      global._mysqlPool = pool;
    }
  }
  return pool;
}

// In-Memory Query Cache for fast responses (1s TTL)
const queryCache = new Map();
const CACHE_TTL_MS = 1000;

export async function query(text, params = []) {
  try {
    let sql = text;

    // 1. Convert Postgres $1, $2, $3 to MySQL ?
    sql = sql.replace(/\$\d+/g, '?');

    // 2. Convert Postgres typecasts
    sql = sql.replace(/::(TEXT|jsonb|timestamptz|integer|int|numeric)/gi, '');

    // 3. Convert gen_random_uuid() to UUID()
    sql = sql.replace(/gen_random_uuid\(\)/gi, 'UUID()');

    // 4. Convert ILIKE to LIKE
    sql = sql.replace(/\bILIKE\b/gi, 'LIKE');

    // 5. Convert ON CONFLICT ... DO UPDATE to MySQL ON DUPLICATE KEY UPDATE
    if (/ON CONFLICT/i.test(sql)) {
      if (/ON CONFLICT\s*\([^)]+\)\s*DO\s+NOTHING/i.test(sql)) {
        sql = sql.replace(/ON CONFLICT\s*\([^)]+\)\s*DO\s+NOTHING/gi, 'ON DUPLICATE KEY UPDATE id=id');
      } else {
        sql = sql.replace(/ON CONFLICT\s*\([^)]+\)\s*DO\s+UPDATE\s+SET/gi, 'ON DUPLICATE KEY UPDATE');
        sql = sql.replace(/EXCLUDED\.(\w+)/gi, 'VALUES($1)');
      }
    }

    // Escape reserved column keyword 'key' if present as column name in SQL
    sql = sql.replace(/\bapp_settings\s*\(\s*key\s*,/gi, 'app_settings (`key`,');
    sql = sql.replace(/\bSET\s+key\s*=/gi, 'SET `key` =');

    // Check if query had RETURNING clause
    const hasReturning = /\s+RETURNING\s+(\*|\w+)/i.test(sql);
    sql = sql.replace(/\s+RETURNING\s+(\*|\w+)/gi, '');

    // Extract table name for RETURNING auto-fetch
    let tableName = null;
    if (hasReturning) {
      const matchInsert = sql.match(/INSERT\s+INTO\s+`?(\w+)`?/i);
      const matchUpdate = sql.match(/UPDATE\s+`?(\w+)`?/i);
      if (matchInsert) tableName = matchInsert[1];
      else if (matchUpdate) tableName = matchUpdate[1];
    }

    const isReadQuery = sql.trim().toUpperCase().startsWith('SELECT');
    const cacheKey = isReadQuery ? `${sql}:${JSON.stringify(params)}` : null;

    if (isReadQuery && cacheKey && queryCache.has(cacheKey)) {
      const cached = queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.result;
      }
    }

    const currentPool = getPool();
    const [result] = await currentPool.query(sql, params);

    let rows = [];
    let rowCount = 0;

    if (Array.isArray(result)) {
      rows = result;
      rowCount = result.length;
    } else if (result && typeof result === 'object') {
      rowCount = result.affectedRows || 0;
      if (hasReturning && tableName) {
        const idParam = params[0] || result.insertId;
        if (idParam) {
          try {
            const [fetchedRows] = await currentPool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [idParam]);
            if (fetchedRows && fetchedRows.length > 0) {
              rows = fetchedRows;
            }
          } catch (e) {
            // silent fallback
          }
        }
      }
    }

    const finalResult = { rows, rowCount };

    if (isReadQuery && cacheKey) {
      queryCache.set(cacheKey, { result: finalResult, timestamp: Date.now() });
    } else {
      queryCache.clear();
    }

    return finalResult;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error(`❌ MySQL Connection Error (ECONNREFUSED): Cannot connect to MySQL at ${process.env.MYSQL_HOST || 'localhost'}:${process.env.MYSQL_PORT || 3306}. (Make sure MySQL/XAMPP is running locally, or deploy to Hostinger where localhost connects directly).`);
    } else {
      console.error(`❌ MySQL Query Error (${err.code || 'UNKNOWN'}):`, err.message);
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
  queryCache.clear();
  const currentPool = getPool();
  const connection = await currentPool.getConnection();
  try {
    await connection.beginTransaction();
    const results = [];
    for (const q of queries) {
      let sql = q.text.replace(/\$\d+/g, '?')
        .replace(/::(TEXT|jsonb|timestamptz|integer|int|numeric)/gi, '')
        .replace(/gen_random_uuid\(\)/gi, 'UUID()')
        .replace(/\bILIKE\b/gi, 'LIKE')
        .replace(/\s+RETURNING\s+(\*|\w+)/gi, '');
      const [res] = await connection.query(sql, q.params || []);
      results.push({ rows: Array.isArray(res) ? res : [], rowCount: res.affectedRows || 0 });
    }
    await connection.commit();
    return results;
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

export default getPool();
