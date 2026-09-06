const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env.local") });

const ACCESS_KEY = process.env.URA_ACCESS_KEY;
if (!ACCESS_KEY) {
  throw new Error("URA_ACCESS_KEY is missing. Check .env.local.");
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const TOKEN_URL = "https://eservice.ura.gov.sg/uraDataService/insertNewToken/v1";
const DATA_URL = "https://eservice.ura.gov.sg/uraDataService/invokeUraDS/v1";
const OUT_PATH = path.join(__dirname, "ura_private_transactions.csv");

function csvEscape(value) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function parseContractDate(value) {
  // "MMYY", e.g. "0522" = May 2022
  const month = parseInt(value.slice(0, 2), 10);
  const year = 2000 + parseInt(value.slice(2, 4), 10);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

async function getToken() {
  const res = await fetch(TOKEN_URL, {
    headers: { AccessKey: ACCESS_KEY, "User-Agent": UA },
  });
  const body = await res.json();
  if (body.Status !== "Success") throw new Error("Token failed: " + JSON.stringify(body));
  return body.Result;
}

async function getBatch(token, batch) {
  const res = await fetch(`${DATA_URL}?service=PMI_Resi_Transaction&batch=${batch}`, {
    headers: { AccessKey: ACCESS_KEY, Token: token, "User-Agent": UA },
  });
  const body = await res.json();
  if (body.Status !== "Success") throw new Error(`Batch ${batch} failed: ` + JSON.stringify(body).slice(0, 300));
  return body.Result;
}

async function main() {
  const token = await getToken();
  console.log("Got token.");

  const out = fs.createWriteStream(OUT_PATH);
  out.write("month,area,property_type,floor_area_sqm,price\n");

  let totalRows = 0;

  for (let batch = 1; batch <= 4; batch++) {
    const projects = await getBatch(token, batch);
    let batchRows = 0;

    for (const project of projects) {
      for (const txn of project.transaction || []) {
        // URA reports "area" in square metres already — no sqft conversion.
        const areaSqm = parseFloat(txn.area);
        const price = parseFloat(txn.price);
        if (!Number.isFinite(areaSqm) || !Number.isFinite(price)) continue;

        out.write(
          [
            parseContractDate(txn.contractDate),
            csvEscape(`D${txn.district}`),
            csvEscape(txn.propertyType || "UNKNOWN"),
            areaSqm,
            price,
          ].join(",") + "\n"
        );
        batchRows++;
      }
    }

    totalRows += batchRows;
    console.log(`Batch ${batch}: ${projects.length} projects, ${batchRows} transactions (running total ${totalRows})`);
  }

  out.end();
  console.log("Done. Total rows written: " + totalRows.toLocaleString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
