import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'appdb',
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'apppassword',
  max: parseInt(process.env.DB_POOL_MAX || '10'),
});

export async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('Database connected');
  } finally {
    client.release();
  }
}
