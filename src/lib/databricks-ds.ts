import { DBSQLClient } from "@databricks/sql";

type QueryParam = string | number | null;

const host = process.env.DATABRICKS_SERVER_HOSTNAME;
const path = process.env.DATABRICKS_HTTP_PATH;
const token = process.env.DATABRICKS_TOKEN;

export function databricksConfigured() {
  return Boolean(host && path && token);
}

export async function runDatabricksQuery(
  statement: string,
  ordinalParameters: QueryParam[] = []
) {
  if (!host || !path || !token) {
    throw new Error(
      "Databricks env vars are missing. Set DATABRICKS_SERVER_HOSTNAME, DATABRICKS_HTTP_PATH, and DATABRICKS_TOKEN in .env.local."
    );
  }

  const client = new DBSQLClient();

  try {
    await client.connect({ host, path, token });
    const session = await client.openSession();

    try {
      const operation = await session.executeStatement(statement, {
        ordinalParameters,
      });

      const rows = await operation.fetchAll();
      await operation.close();

      return rows as Record<string, unknown>[];
    } finally {
      await session.close();
    }
  } finally {
    await client.close();
  }
}
