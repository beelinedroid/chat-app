const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);

    if (req.method === 'POST') {
      const { username, text } = req.body || {};
      if (!username || !text) return res.status(400).json({ error: 'username and text required' });
      await pool.query('INSERT INTO messages (username, text) VALUES ($1, $2)',
        [String(username).slice(0, 30), String(text).slice(0, 500)]);
      return res.status(201).json({ ok: true });
    }

    const after = parseInt(req.query.after) || 0;
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT id, username, text, created_at FROM messages
         WHERE id > $1 ORDER BY id DESC LIMIT 50
       ) t ORDER BY id ASC`, [after]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
};
