const fs = require("fs");
const path = require("path");

function csvEscape(value) {
  // Flatten to a single line — the "Create or modify table" upload wizard
  // doesn't handle multi-line quoted CSV fields, it splits on every \n.
  const s = String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return '"' + s.replace(/"/g, '""') + '"';
}

const docs = [
  {
    filename: "pr26-31-summary.txt",
    page: 1,
    text: fs.readFileSync(path.join(__dirname, "pr26-31-summary.txt"), "utf8"),
  },
  {
    filename: "pr26-31a-1-price-index.pdf",
    page: 1,
    text: `ANNEX A-1 COMPARISON OF PROPERTY PRICE INDEX FOR 4TH QUARTER 2025 AND 1ST QUARTER 2026.
All Residential (1Q09=100): 4Q/25 index 216.4, 1Q/26 index 218.3, change 4Q/25 0.6%, change 1Q/26 0.9%.
Landed Property: 4Q/25 253.1, 1Q/26 252.1, change 4Q/25 3.4%, change 1Q/26 -0.4%.
Non-Landed Property: 4Q/25 208.1, 1Q/26 210.8, change 4Q/25 -0.2%, change 1Q/26 1.3%.
CCR (Core Central Region): 4Q/25 157.7, 1Q/26 158.6, change 4Q/25 -3.5%, change 1Q/26 0.6%.
RCR (Rest of Central Region): 4Q/25 227.1, 1Q/26 228.9, change 4Q/25 0.7%, change 1Q/26 0.8%.
OCR (Outside Central Region): 4Q/25 265.6, 1Q/26 271.4, change 4Q/25 1.0%, change 1Q/26 2.2%.
Commercial (4Q98=100): Office 4Q/25 110.7, 1Q/26 110.9, change 4Q/25 -0.7%, change 1Q/26 0.2%.
Retail: 4Q/25 101.4, 1Q/26 103.6, change 4Q/25 1.7%, change 1Q/26 2.2%.`,
  },
  {
    filename: "pr26-31a-2-rental-index.pdf",
    page: 1,
    text: `ANNEX A-2 COMPARISON OF RENTAL INDEX FOR 4TH QUARTER 2025 AND 1ST QUARTER 2026.
All Residential (1Q09=100): 4Q/25 index 160.9, 1Q/26 index 161.4, change 4Q/25 -0.5%, change 1Q/26 0.3%.
Landed Property: 4Q/25 152.1, 1Q/26 152.3, change 4Q/25 -3.0%, change 1Q/26 0.1%.
Non-Landed Property: 4Q/25 161.3, 1Q/26 161.9, change 4Q/25 -0.1%, change 1Q/26 0.4%.
CCR: 4Q/25 150.3, 1Q/26 151.1, change 4Q/25 0.7%, change 1Q/26 0.5%.
RCR: 4Q/25 172.6, 1Q/26 172.3, change 4Q/25 0.6%, change 1Q/26 -0.2%.
OCR: 4Q/25 167.8, 1Q/26 169.5, change 4Q/25 -2.0%, change 1Q/26 1.0%.
Commercial (4Q98=100): Office 4Q/25 200.6, 1Q/26 200.2, change 4Q/25 0.4%, change 1Q/26 -0.2%.
Retail: 4Q/25 80.6, 1Q/26 80.1, change 4Q/25 0.6%, change 1Q/26 -0.6%.`,
  },
  {
    filename: "pr26-31b-unsold-units.pdf",
    page: 1,
    text: `Annex B NUMBER OF UNSOLD PRIVATE RESIDENTIAL UNITS FROM PROJECTS WITH PLANNING APPROVALS.
Uncompleted Units, Whole Island: 4Q/2025 14,859; 1Q/2026 16,095; change 8.3%.
Uncompleted Units, Core Central Region: 4Q/2025 5,600; 1Q/2026 5,487; change -2.0%.
Uncompleted Units, Rest of Central Region: 4Q/2025 4,142; 1Q/2026 4,972; change 20.0%.
Uncompleted Units, Outside Central Region: 4Q/2025 5,117; 1Q/2026 5,636; change 10.1%.
Completed Units, Whole Island: 4Q/2025 148; 1Q/2026 124; change -16.2%.
Completed Units, Core Central Region: 4Q/2025 84; 1Q/2026 81; change -3.6%.
Completed Units, Rest of Central Region: 4Q/2025 42; 1Q/2026 33; change -21.4%.
Completed Units, Outside Central Region: 4Q/2025 22; 1Q/2026 10; change -54.5%.`,
  },
  {
    filename: "pr26-31d-transactions.pdf",
    page: 1,
    text: `ANNEX D NUMBER OF NEW SALE, SUB-SALE AND RESALE TRANSACTIONS FOR PRIVATE RESIDENTIAL UNITS BY MARKET SEGMENT.
Core Central Region quarterly transactions (New Sale / Sub-sale / Resale / Total): 4Q/2022 381/8/494/883; 1Q/2023 541/7/543/1091; 2Q/2023 445/9/541/995; 3Q/2023 253/10/525/788; 4Q/2023 215/8/521/744; 1Q/2024 106/9/490/605; 2Q/2024 81/21/713/815; 3Q/2024 54/11/659/724; 4Q/2024 137/17/631/785; 1Q/2025 192/34/675/901; 2Q/2025 44/15/640/699; 3Q/2025 903/27/710/1640; 4Q/2025 777/24/674/1475; 1Q/2026 697/19/597/1313.
Rest of Central Region quarterly transactions (New Sale / Sub-sale / Resale / Total): 4Q/2022 186/106/728/1020; 1Q/2023 257/128/707/1092; 2Q/2023 1573/133/908/2614; 3Q/2023 968/129/834/1931; 4Q/2023 233/146/830/1209; 1Q/2024 235/137/776/1148; 2Q/2024 230/148/1091/1469; 3Q/2024 391/161/1088/1640; 4Q/2024 1859/142/1131/3132; 1Q/2025 945/122/1064/2131; 2Q/2025 902/141/1086/2129; 3Q/2025 1090/119/1165/2374; 4Q/2025 1544/103/1021/2668; 1Q/2026 400/83/913/1396.`,
  },
  {
    filename: "pr26-31d-transactions.pdf",
    page: 2,
    text: `ANNEX D (cont'd) NUMBER OF NEW SALE, SUB-SALE AND RESALE TRANSACTIONS FOR PRIVATE RESIDENTIAL UNITS BY MARKET SEGMENT.
Outside Central Region quarterly transactions (New Sale / Sub-sale / Resale / Total): 4Q/2022 123/90/1472/1685; 1Q/2023 458/108/1372/1938; 2Q/2023 109/143/1527/1779; 3Q/2023 725/216/1541/2482; 4Q/2023 644/257/1480/2381; 1Q/2024 823/231/1423/2477; 2Q/2024 414/219/1998/2631; 3Q/2024 715/180/2113/3008; 4Q/2024 1424/152/1940/3516; 1Q/2025 2238/165/1826/4229; 2Q/2025 266/113/1921/2300; 3Q/2025 1295/89/2006/3390; 4Q/2025 619/103/1834/2556; 1Q/2026 916/73/1715/2704.
Whole of Singapore quarterly transactions (New Sale / Sub-sale / Resale / Total): 4Q/2022 690/204/2694/3588; 1Q/2023 1256/243/2622/4121; 2Q/2023 2127/285/2976/5388; 3Q/2023 1946/355/2900/5201; 4Q/2023 1092/411/2831/4334; 1Q/2024 1164/377/2689/4230; 2Q/2024 725/388/3802/4915; 3Q/2024 1160/352/3860/5372; 4Q/2024 3420/311/3702/7433; 1Q/2025 3375/321/3565/7261; 2Q/2025 1212/269/3647/5128; 3Q/2025 3288/235/3881/7404; 4Q/2025 2940/230/3529/6699; 1Q/2026 2013/175/3225/5413.`,
  },
];

const out = ["filename,page,quarter,text"];

for (const d of docs) {
  out.push(
    [csvEscape(d.filename), d.page, csvEscape("1Q2026"), csvEscape(d.text)].join(",")
  );
}

fs.writeFileSync(path.join(__dirname, "ura_reports.csv"), out.join("\n") + "\n");
console.log("Wrote ura_reports.csv with " + docs.length + " rows");
