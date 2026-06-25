import DashboardClient from "@/components/dashboard-clients";
import { sql } from "@/lib/ds";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [townRows, flatTypeRows] = await sql.transaction([
    sql`
      SELECT DISTINCT town
      FROM hdb_resale_transactions
      ORDER BY town
    `,
    sql`
      SELECT DISTINCT flat_type
      FROM hdb_resale_transactions
      ORDER BY flat_type
    `,
  ]);

  return (
    <DashboardClient
      towns={townRows.map((row) => String(row.town))}
      flatTypes={flatTypeRows.map((row) => String(row.flat_type))}
    />
  );
}