import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DATABRICKS_SERVER_HOSTNAME: process.env.DATABRICKS_SERVER_HOSTNAME,
    DATABRICKS_HTTP_PATH: process.env.DATABRICKS_HTTP_PATH,
    DATABRICKS_TOKEN: process.env.DATABRICKS_TOKEN,
    DATABRICKS_CATALOG: process.env.DATABRICKS_CATALOG,
    DATABRICKS_SCHEMA: process.env.DATABRICKS_SCHEMA,
  },
  // @databricks/sql ships native addons (lz4-napi, kernel bindings) that
  // Turbopack/webpack can't bundle — load them from node_modules at runtime.
  serverExternalPackages: ["@databricks/sql"],
};

export default nextConfig;
