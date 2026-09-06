const fs = require("fs");
const path = require("path");

const RESOURCE_ID = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";
const PAGE_SIZE = 10000;
const OUT_PATH = path.join(__dirname, "hdb_resale.csv");

function csvEscape(value) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function main() {
  const out = fs.createWriteStream(OUT_PATH);
  out.write("month,area,property_type,floor_area_sqm,price\n");

  let offset = 0;
  let total = Infinity;
  let written = 0;

  while (offset < total) {
    const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${RESOURCE_ID}&limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const body = await res.json();
    const records = body.result.records;
    total = body.result.total;

    for (const r of records) {
      const floorArea = r.floor_area_sqm ? Number(r.floor_area_sqm) : "";
      const price = Number(r.resale_price);
      out.write(
        [
          r.month + "-01",
          csvEscape(r.town),
          csvEscape(r.flat_type),
          floorArea,
          price,
        ].join(",") + "\n"
      );
    }

    written += records.length;
    offset += records.length;
    console.log(`Fetched ${written.toLocaleString()} / ${total.toLocaleString()}`);

    if (records.length < PAGE_SIZE) break;
  }

  out.end();
  console.log("Done. Total rows written: " + written.toLocaleString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
