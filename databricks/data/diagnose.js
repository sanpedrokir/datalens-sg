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
  console.log("Catalogs:");
  console.log(await run("SHOW CATALOGS"));

  console.log("Schemas in workspace:");
  console.log(await run("SHOW SCHEMAS IN workspace"));

  console.log("Tables in workspace.sg_property (if it exists):");
  try {
    console.log(await run("SHOW TABLES IN workspace.sg_property"));
  } catch (e) {
    console.log("  -> " + e.message);
  }

  console.log("Tables in workspace.default:");
  try {
    console.log(await run("SHOW TABLES IN workspace.default"));
  } catch (e) {
    console.log("  -> " + e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
