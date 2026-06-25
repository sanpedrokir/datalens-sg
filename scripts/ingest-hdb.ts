import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from .env.local");
}

const sql = neon(process.env.DATABASE_URL);

// HDB Resale Flat Prices (Jan 2017 onwards)
// Find the resource_id at: https://data.gov.sg/datasets?query=resale+flat+prices
const RESOURCE_ID = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";
const PAGE_SIZE = 10000;

interface HdbRecord {
  month: string;
  town: string;
  flat_type: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: string;
  flat_model: string;
  lease_commence_date: string;
  remaining_lease: string;
  resale_price: string;
}

async function setup() {
  await sql`DROP TABLE IF EXISTS hdb_resale_transactions`;
  await sql`
    CREATE TABLE hdb_resale_transactions (
      id                  SERIAL  PRIMARY KEY,
      month               DATE    NOT NULL,
      town                TEXT    NOT NULL,
      flat_type           TEXT    NOT NULL,
      block               TEXT,
      street_name         TEXT,
      storey_range        TEXT,
      floor_area_sqm      NUMERIC,
      flat_model          TEXT,
      lease_commence_date INTEGER,
      remaining_lease     TEXT,
      resale_price        NUMERIC NOT NULL
    )
  `;
  await sql`CREATE INDEX idx_hdb_month     ON hdb_resale_transactions (month)`;
  await sql`CREATE INDEX idx_hdb_town      ON hdb_resale_transactions (town)`;
  await sql`CREATE INDEX idx_hdb_flat_type ON hdb_resale_transactions (flat_type)`;
  console.log("Schema ready.");
}

async function fetchPage(offset: number): Promise<{ records: HdbRecord[]; total: number }> {
  const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${RESOURCE_ID}&limit=${PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`data.gov.sg returned HTTP ${res.status}. Check RESOURCE_ID in the script.`);
  const body = (await res.json()) as { result: { records: HdbRecord[]; total: number } };
  return body.result;
}

async function insertBatch(rows: HdbRecord[]) {
  if (rows.length === 0) return;

  const months          = rows.map(r => `${r.month}-01`);
  const towns           = rows.map(r => r.town);
  const flatTypes       = rows.map(r => r.flat_type);
  const blocks          = rows.map(r => r.block ?? null);
  const streetNames     = rows.map(r => r.street_name ?? null);
  const storeyRanges    = rows.map(r => r.storey_range ?? null);
  const floorAreas      = rows.map(r => parseFloat(r.floor_area_sqm) || null);
  const flatModels      = rows.map(r => r.flat_model ?? null);
  const leaseYears      = rows.map(r => parseInt(r.lease_commence_date) || null);
  const remainingLeases = rows.map(r => r.remaining_lease ?? null);
  const prices          = rows.map(r => parseFloat(r.resale_price));

  await sql.query(
    `INSERT INTO hdb_resale_transactions
       (month, town, flat_type, block, street_name, storey_range,
        floor_area_sqm, flat_model, lease_commence_date, remaining_lease, resale_price)
     SELECT * FROM UNNEST(
       $1::date[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
       $7::numeric[], $8::text[], $9::integer[], $10::text[], $11::numeric[]
     ) AS t(month, town, flat_type, block, street_name, storey_range,
            floor_area_sqm, flat_model, lease_commence_date, remaining_lease, resale_price)`,
    [months, towns, flatTypes, blocks, streetNames, storeyRanges,
     floorAreas, flatModels, leaseYears, remainingLeases, prices]
  );
}

async function main() {
  await setup();

  console.log("Starting ingest...");

  let offset = 0;
  let total = Infinity;
  let inserted = 0;

  while (offset < total) {
    const { records, total: pageTotal } = await fetchPage(offset);
    total = pageTotal;

    await insertBatch(records);
    inserted += records.length;
    offset += records.length;

    console.log(`Inserted ${inserted.toLocaleString()} / ${total.toLocaleString()}`);

    if (records.length < PAGE_SIZE) break;
  }

  console.log(`Done. Total rows inserted: ${inserted.toLocaleString()}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
