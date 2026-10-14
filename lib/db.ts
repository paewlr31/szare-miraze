import { Pool, type PoolClient } from "pg";

let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("Brak DATABASE_URL.");
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 1,
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id uuid PRIMARY KEY,
        guest_name text NOT NULL,
        guest_phone text NOT NULL,
        check_in text NOT NULL,
        check_out text NOT NULL,
        status text NOT NULL,
        cancel_token text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        rejected_at timestamptz,
        owner_sms jsonb NOT NULL,
        guest_sms jsonb,
        guest_confirm_sms jsonb
      )
    `);
    await getPool().query(`
      CREATE INDEX IF NOT EXISTS bookings_pending_range
      ON bookings (status, check_in, check_out)
    `);
  })();
  return schemaReady;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(471142)");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
