const { query } = require('./src/lib/db');
query("DELETE FROM orders WHERE id LIKE 'ord_test_%'").then(r => console.log('Cleaned:', r.rowCount)).finally(() => process.exit(0));
