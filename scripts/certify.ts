import { createClient } from "@libsql/client/http";

const c = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
});

async function certify() {
  try {
    const [active, gold, last30] =
      await Promise.all([
        c.execute(
          `SELECT COUNT(*) as n
           FROM opportunities
           WHERE is_active=1`
        ),
        c.execute(
          `SELECT COUNT(*) as n
           FROM opportunities
           WHERE tier=1
           AND is_active=1`
        ),
        c.execute(
          `SELECT COUNT(*) as n
           FROM opportunities
           WHERE scraped_at > unixepoch('now','-30 minutes')`
        )
      ]);
    const a = (active.rows[0] as any).n;
    const g = (gold.rows[0] as any).n;
    const r = (last30.rows[0] as any).n;
    console.log(a > 273
      ? `CERT1 PASS: ${a} active`
      : `CERT1 FAIL: ${a} active`);
    console.log(g > 0
      ? `CERT2 PASS: ${g} GOLD`
      : `CERT2 FAIL: ${g} GOLD`);
    console.log(r > 0
      ? `CERT3 PASS: ${r} fresh writes`
      : `CERT3 FAIL: ${r} fresh writes`);
  } catch (err: any) {
    console.error("CERT_ERR:", err.message);
  } finally { c.close(); }
}

certify();
