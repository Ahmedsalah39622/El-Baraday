import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

// Serverless-optimized MySQL connection pool for Hostinger phpMyAdmin
let pool;
let currentHostFallback = null;

export function getPool() {
  if (!pool) {
    if (global._mysqlPool) {
      pool = global._mysqlPool;
    } else {
      const rawHost = (process.env.MYSQL_HOST || process.env.DB_HOST || 'srv1788.hstgr.io').trim();
      // Bypasses DNS resolution issues on Vercel serverless functions by using direct IP if domain fails
      let host = (rawHost === 'localhost' || rawHost === '127.0.0.1') ? 'localhost' : (rawHost || 'srv1788.hstgr.io');

      if (currentHostFallback) {
        host = currentHostFallback;
      }

      const config = {
        host: host,
        user: (process.env.MYSQL_USER || process.env.DB_USER || 'u407531143_bara').trim(),
        password: (process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || 'Q+x;s3r=n9').trim(),
        database: (process.env.MYSQL_DATABASE || process.env.DB_NAME || 'u407531143_bara').trim(),
        port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        connectTimeout: 5000, // Fail fast to trigger retry/fallback
        maxIdle: 5, // Keep connections alive to prevent connection handshake count exhaustion
        idleTimeout: 60000, // Keep connections in pool for up to 60 seconds
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

// Global set to prevent repeated DDL ALTER/CREATE table checks on serverless warm instances
if (!global._ensuredSchemas) {
  global._ensuredSchemas = new Set();
}

export function isSchemaChecked(key) {
  return global._ensuredSchemas.has(key);
}

export function markSchemaChecked(key) {
  global._ensuredSchemas.add(key);
}

// In-Memory Query Cache for fast responses (2.5s TTL)
const queryCache = new Map();
const CACHE_TTL_MS = 2500;

export async function query(text, params = []) {
  try {
    let sql = text;

    // 2. Convert Postgres typecasts
    sql = sql.replace(/::(TEXT|jsonb|timestamptz|integer|int|numeric)/gi, '');

    // 1. Convert Postgres $1, $2, $3 to MySQL ? and expand parameters accordingly
    const matches = sql.match(/\$\d+/g);
    let mappedParams = [...params];
    if (matches) {
      const indices = matches.map(m => parseInt(m.substring(1)));
      sql = sql.replace(/\$\d+/g, '?');
      mappedParams = indices.map(idx => params[idx - 1]);
    }

    // 3. Convert gen_random_uuid() to explicit generated UUID string
    let genUuid = null;
    if (/gen_random_uuid\(\)/i.test(sql)) {
      genUuid = randomUUID();
      sql = sql.replace(/gen_random_uuid\(\)/gi, `'${genUuid}'`);
    }

    // 4. Convert ILIKE to LIKE
    sql = sql.replace(/\bILIKE\b/gi, 'LIKE');

    // 5. Convert ON CONFLICT ... DO UPDATE to MySQL ON DUPLICATE KEY UPDATE
    if (/ON CONFLICT/i.test(sql)) {
      if (/ON CONFLICT\s*\([^)]+\)\s*DO\s+NOTHING/i.test(sql)) {
        sql = sql.replace(/ON CONFLICT\s*\([^)]+\)\s*DO\s+NOTHING/gi, 'ON DUPLICATE KEY UPDATE `key`=`key`');
      } else {
        sql = sql.replace(/ON CONFLICT\s*\([^)]+\)\s*DO\s+UPDATE\s+SET\s+`?value`?\s*=\s*\$2/gi, 'ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)');
        sql = sql.replace(/ON CONFLICT\s*\([^)]+\)\s*DO\s+UPDATE\s+SET/gi, 'ON DUPLICATE KEY UPDATE');
        sql = sql.replace(/EXCLUDED\.(\w+)/gi, 'VALUES($1)');
      }
    }

    // Escape reserved column keyword 'key' if present as column name in SQL
    sql = sql.replace(/\bapp_settings\s*\(\s*key\s*,/gi, 'app_settings (`key`,');
    sql = sql.replace(/\bSET\s+key\s*=/gi, 'SET `key` =');

    // 6. Auto-inject UUID for INSERT queries missing an id column
    // Matches: INSERT INTO tableName (col1, col2, ...) — if 'id' not in column list
    let injectedId = null;
    const insertMatch = sql.match(/INSERT\s+INTO\s+`?(\w+)`?\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1].toLowerCase();
      const cols = insertMatch[2].split(',').map(c => c.trim().replace(/`/g, ''));
      if (!cols.includes('id') && tableName !== 'app_settings') {
        injectedId = randomUUID();
        // Inject id into column list and values
        sql = sql.replace(
          /INSERT\s+INTO\s+(`?\w+`?)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i,
          (_, tbl, colList, valList) => `INSERT INTO ${tbl} (id, ${colList}) VALUES (?, ${valList})`
        );
        mappedParams = [injectedId, ...mappedParams];
      }
    }

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
    const cacheKey = isReadQuery ? `${sql}:${JSON.stringify(mappedParams)}` : null;

    if (isReadQuery && cacheKey && queryCache.has(cacheKey)) {
      const cached = queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.result;
      }
    }

    let result;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        const currentPool = getPool();
        const [res] = await currentPool.query(sql, mappedParams);
        result = res;
        break;
      } catch (err) {
        attempts++;
        const isConnectionError = [
          'PROTOCOL_CONNECTION_LOST',
          'ECONNRESET',
          'EPIPE',
          'ETIMEDOUT',
          'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
          'PROTOCOL_CONNECTION_CLOSE',
          'ER_SERVER_SHUTDOWN',
          'HANDSHAKE_TIMEOUT',
          'ENOTFOUND',
          'ECONNREFUSED'
        ].includes(err.code);

        if (isConnectionError && attempts < maxAttempts) {
          const rawHost = (process.env.MYSQL_HOST || process.env.DB_HOST || 'srv1788.hstgr.io').trim();
          console.warn(`⚠️ MySQL Connection error encountered (${err.code}). Recreating pool and retrying (attempt ${attempts}/${maxAttempts})...`);

          if ((err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') && rawHost === 'srv1788.hstgr.io') {
            console.log('Falling back to direct IP address 193.203.168.173 to bypass DNS issues.');
            currentHostFallback = '193.203.168.173';
          }

          if (global._mysqlPool) {
            const oldPool = global._mysqlPool;
            global._mysqlPool = null;
            pool = null;
            oldPool.end().catch(() => { });
          }

          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        throw err;
      }
    }

    let rows = [];
    let rowCount = 0;

    if (Array.isArray(result)) {
      rows = result;
      rowCount = result.length;
    } else if (result && typeof result === 'object') {
      rowCount = result.affectedRows || 0;
      if (hasReturning && tableName) {
        // Use injected UUID, or genUuid, or MySQL insertId, or last param (WHERE id = ?), or first param
        const idParam = injectedId || genUuid || (result.insertId && result.insertId !== 0 ? result.insertId : null) || mappedParams[mappedParams.length - 1] || mappedParams[0];
        if (idParam) {
          try {
            const currentPool = getPool();
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
    // Ignore duplicate column addition warnings (ER_DUP_FIELDNAME)
    if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
      return { rows: [], rowCount: 0 };
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      console.error(`❌ MySQL Connection Error (${err.code}): Cannot reach host ${process.env.MYSQL_HOST || '193.203.168.173'}`);
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
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    let connection = null;
    try {
      const currentPool = getPool();
      connection = await currentPool.getConnection();
      await connection.beginTransaction();
      const results = [];
      for (const q of queries) {
        let sql = q.text
          .replace(/::(TEXT|jsonb|timestamptz|integer|int|numeric)/gi, '')
          .replace(/gen_random_uuid\(\)/gi, 'UUID()')
          .replace(/\bILIKE\b/gi, 'LIKE')
          .replace(/\s+RETURNING\s+(\*|\w+)/gi, '');

        const matches = sql.match(/\$\d+/g);
        let mappedParams = q.params ? [...q.params] : [];
        if (matches) {
          const indices = matches.map(m => parseInt(m.substring(1)));
          sql = sql.replace(/\$\d+/g, '?');
          mappedParams = indices.map(idx => (q.params || [])[idx - 1]);
        } else {
          sql = sql.replace(/\$\d+/g, '?'); // safety fallback
        }

        const [res] = await connection.query(sql, mappedParams);
        results.push({ rows: Array.isArray(res) ? res : [], rowCount: res.affectedRows || 0 });
      }
      await connection.commit();
      return results;
    } catch (err) {
      attempts++;
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackErr) {
          // ignore rollback failure
        }
        try {
          connection.release();
        } catch (releaseErr) {
          // ignore release failure
        }
        connection = null;
      }

      const isConnectionError = [
        'PROTOCOL_CONNECTION_LOST',
        'ECONNRESET',
        'EPIPE',
        'ETIMEDOUT',
        'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
        'PROTOCOL_CONNECTION_CLOSE',
        'ER_SERVER_SHUTDOWN',
        'HANDSHAKE_TIMEOUT',
        'ENOTFOUND',
        'ECONNREFUSED'
      ].includes(err.code);

      if (isConnectionError && attempts < maxAttempts) {
        const rawHost = (process.env.MYSQL_HOST || process.env.DB_HOST || 'srv1788.hstgr.io').trim();
        console.warn(`⚠️ MySQL Transaction connection error encountered (${err.code}). Recreating pool and retrying (attempt ${attempts}/${maxAttempts})...`);

        if ((err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') && rawHost === 'srv1788.hstgr.io') {
          console.log('Falling back to direct IP address 193.203.168.173 to bypass DNS issues.');
          currentHostFallback = '193.203.168.173';
        }

        if (global._mysqlPool) {
          const oldPool = global._mysqlPool;
          global._mysqlPool = null;
          pool = null;
          oldPool.end().catch(() => { });
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      throw err;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

export default getPool();
