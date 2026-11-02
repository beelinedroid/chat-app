const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const json = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

exports.handler = async (event) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);

    if (event.httpMethod === 'POST') {
      const { username, text } = JSON.parse(event.body || '{}');
      if (!username || !text) return json(400, { error: 'username and text required' });
      await pool.query('INSERT INTO messages (username, text) VALUES ($1, $2)',
        [String(username).slice(0, 30), String(text).slice(0, 500)]);
      return json(201, { ok: true });
    }

    const after = parseInt(event.queryStringParameters?.after) || 0;
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT id, username, text, created_at FROM messages
         WHERE id > $1 ORDER BY id DESC LIMIT 50
       ) t ORDER BY id ASC`, [after]);
    return json(200, rows);
  } catch (e) {
    console.error(e);
    return json(500, { error: 'server error' });
  }
};
