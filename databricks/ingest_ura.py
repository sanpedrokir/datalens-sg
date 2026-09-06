# Databricks notebook source
# Ingests URA private residential transactions (free Property Market
# Information API) into a Delta table.
#
# PREREQUISITE: register for a free Access Key at
#   https://www.ura.gov.sg/maps/api/
# Approval is manual on URA's side, not instant like data.gov.sg.
#
# IMPORTANT — VERIFY BEFORE TRUSTING THIS SCRIPT:
# The token/data endpoints and the field names below (contractDate, district,
# propertyType, area, price, etc.) are URA's PMI_Resi_Transaction API as
# documented at the time this was written. URA has been known to tweak field
# names and batch semantics. Run the "PROBE" cell first, read the printed raw
# JSON of one record, and fix the field names in the mapping cell if they
# don't match what you actually receive — don't assume this is correct
# without looking at real output first.

# COMMAND ----------

CATALOG = "workspace"
SCHEMA = "sg_property"
TABLE = "ura_private_transactions"

# Set this as a Databricks secret or paste it directly for a quick test:
# dbutils.secrets.get(scope="...", key="ura_access_key")
ACCESS_KEY = ""  # <-- put your URA Access Key here

TOKEN_URL = "https://www.ura.gov.sg/uraDataService/insertNewToken.action"
DATA_URL = "https://www.ura.gov.sg/uraDataService/invokeUraDS"
SERVICE = "PMI_Resi_Transaction"

# COMMAND ----------
# PROBE: fetch a token, pull batch 1, and print one raw record so you can
# confirm the actual field names before trusting the mapping below.

import requests

def get_token():
    res = requests.get(TOKEN_URL, headers={"AccessKey": ACCESS_KEY}, timeout=30)
    res.raise_for_status()
    body = res.json()
    if body.get("Status") != "Success":
        raise RuntimeError(f"Token request failed: {body}")
    return body["Result"]

def get_batch(token: str, batch: int):
    res = requests.get(
        DATA_URL,
        params={"service": SERVICE, "batch": batch},
        headers={"AccessKey": ACCESS_KEY, "Token": token},
        timeout=60,
    )
    res.raise_for_status()
    body = res.json()
    if body.get("Status") != "Success":
        raise RuntimeError(f"Data request failed: {body}")
    return body["Result"]

token = get_token()
probe = get_batch(token, 1)
print(f"Projects in batch 1: {len(probe)}")
print("Sample project record:")
print(probe[0])
if probe[0].get("transaction"):
    print("Sample transaction record within a project:")
    print(probe[0]["transaction"][0])

# COMMAND ----------
# MAPPING — adjust field names here if the probe above printed different keys.
# URA's PMI response is nested: each element is a project, with a
# "transaction" list of individual sale records inside it.

from pyspark.sql import Row
from pyspark.sql.types import (
    StructType, StructField, DateType, StringType, DoubleType
)
from datetime import datetime

SQFT_TO_SQM = 0.09290304

def parse_contract_date(value: str):
    # URA uses "MMYY", e.g. "0125" = Jan 2025
    month = int(value[:2])
    year = 2000 + int(value[2:])
    return datetime(year, month, 1).date()

rows = []

for batch in range(1, 5):  # batches 1-4 cover different rolling date windows
    projects = get_batch(token, batch)

    for project in projects:
        district = project.get("district")
        property_type = project.get("propertyType")

        for txn in project.get("transaction", []):
            try:
                area_sqft = float(txn["area"])
                price = float(txn["price"])
            except (KeyError, TypeError, ValueError):
                continue

            rows.append(Row(
                month=parse_contract_date(txn["contractDate"]),
                area=f"D{district}" if district else "UNKNOWN",
                property_type=property_type or "UNKNOWN",
                floor_area_sqm=area_sqft * SQFT_TO_SQM,
                price=price,
            ))

    print(f"Batch {batch}: {len(rows):,} cumulative rows")

print(f"Total rows parsed: {len(rows):,}")

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
