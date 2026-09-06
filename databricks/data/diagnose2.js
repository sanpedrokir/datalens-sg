require("dotenv").config({ path: "../../.env.local" });
const { DBSQLClient } = require("@databricks/sql");

async function run(sql) {
  const client = new DBSQLClient();
  await client.connect({
    host: process.env.DATABRICKS_SERVER_HOSTNAME,
    path: process.env.DATABRICKS_HTTP_PATH,
    token: process.env.DATABRICKS_TOKEN,
  });
  const session = await client.openSession();
  const op = await session.executeStatement(sql);
  const rows = await op.fetchAll();
  await op.close();
  await session.close();
  await client.close();
  return rows;
}

async function main() {
  console.log("Volumes in workspace.default:");
  try {
    console.log(await run("SHOW VOLUMES IN workspace.default"));
  } catch (e) {
    console.log("  -> " + e.message);
  }

  console.log("Tables in workspace.default:");
  console.log(await run("SHOW TABLES IN workspace.default"));

  console.log("Sample rows from ura_reports table:");
  try {
    console.log(await run("SELECT filename, page, quarter, length(text) AS text_len FROM workspace.default.ura_reports"));
  } catch (e) {
    console.log("  -> " + e.message);
  }

  console.log("Files in ura_reports volume:");
  try {
    console.log(await run("LIST '/Volumes/workspace/default/ura_reports'"));
  } catch (e) {
    console.log("  -> " + e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
