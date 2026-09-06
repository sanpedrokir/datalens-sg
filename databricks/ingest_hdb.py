# Databricks notebook source
# Ingests HDB resale flat transactions from data.gov.sg into a Delta table.
#
# HOW TO USE:
#   Databricks workspace -> Workspace -> Import -> upload this file
#   (or paste its contents into a new Python notebook), attach it to your
#   compute / SQL warehouse, then "Run all".
#
# This mirrors scripts/ingest-hdb.ts (the script that seeds Neon) but writes
# into a Delta table instead, with normalized column names (area,
# property_type, price) so the same query builder in the Next.js app can
# target either this table or ura_private_transactions.

# COMMAND ----------

CATALOG = "workspace"   # change if your workspace uses a different catalog
SCHEMA = "sg_property"  # created below if it doesn't exist
TABLE = "hdb_resale"

RESOURCE_ID = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc"  # HDB Resale Flat Prices (Jan 2017 onwards)
PAGE_SIZE = 10000

# COMMAND ----------

import requests
from pyspark.sql import Row
from pyspark.sql.types import (
    StructType, StructField, DateType, StringType, DoubleType
)
from datetime import datetime

def fetch_page(offset: int):
    url = (
        "https://data.gov.sg/api/action/datastore_search"
        f"?resource_id={RESOURCE_ID}&limit={PAGE_SIZE}&offset={offset}"
    )
    res = requests.get(url, timeout=60)
    res.raise_for_status()
    return res.json()["result"]

rows = []
offset = 0
total = None

while total is None or offset < total:
    result = fetch_page(offset)
    total = result["total"]
    records = result["records"]

    for r in records:
        try:
            floor_area = float(r["floor_area_sqm"]) if r.get("floor_area_sqm") else None
            price = float(r["resale_price"])
        except (TypeError, ValueError):
            continue

        rows.append(Row(
            month=datetime.strptime(r["month"] + "-01", "%Y-%m-%d").date(),
            area=r["town"],
            property_type=r["flat_type"],
            floor_area_sqm=floor_area,
            price=price,
        ))

    offset += len(records)
    print(f"Fetched {offset:,} / {total:,}")

    if len(records) < PAGE_SIZE:
        break

print(f"Total rows fetched: {len(rows):,}")

# COMMAND ----------

schema = StructType([
    StructField("month", DateType(), False),
    StructField("area", StringType(), False),
    StructField("property_type", StringType(), False),
    StructField("floor_area_sqm", DoubleType(), True),
    StructField("price", DoubleType(), False),
])

df = spark.createDataFrame(rows, schema=schema)

spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA}")

(
    df.write
    .mode("overwrite")
    .format("delta")
    .saveAsTable(f"{CATALOG}.{SCHEMA}.{TABLE}")
)

print(f"Wrote {df.count():,} rows to {CATALOG}.{SCHEMA}.{TABLE}")

# COMMAND ----------

display(spark.sql(f"SELECT * FROM {CATALOG}.{SCHEMA}.{TABLE} LIMIT 10"))
