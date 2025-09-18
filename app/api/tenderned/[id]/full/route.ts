import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const username = process.env.TENDERNED_USER;
  const password = process.env.TENDERNED_PASS;
  const baseUrl =
    process.env.TENDERNED_URL ||
    "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Missing TENDERNED_USER or TENDERNED_PASS in environment variables" },
      { status: 500 }
    );
  }

  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const parser = new XMLParser({ ignoreAttributes: false });

  // helper voor JSON calls
  const fetchJson = async (url: string) => {
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    return res.ok ? await res.json() : null;
  };

  // helper voor XML calls
  const fetchXml = async (url: string) => {
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "*/*",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const xml = await res.text();
    return parser.parse(xml);
  };

  try {
    // Stap 1: hoofd-publicatie JSON
    const publication = await fetchJson(`${baseUrl}/publicaties/${id}`);

    // Stap 2: documenten
    const documents = await fetchJson(`${baseUrl}/publicaties/${id}/documenten`);

    // Stap 3: vragen & antwoorden
    const questions = await fetchJson(`${baseUrl}/publicaties/${id}/vragen`);

    // Stap 4: XML met percelen
    const xmlData = await fetchXml(`${baseUrl}/publicaties/${id}/public-xml`);

    let lots: any[] = [];
    try {
      const rawLots =
        xmlData?.ContractAwardNotice?.["cac:ProcurementProjectLot"];
      if (rawLots) {
        const arr = Array.isArray(rawLots) ? rawLots : [rawLots];
        lots = arr.map((lot: any) => ({
          id: lot?.["cbc:ID"]?.["#text"] || null,
          titel: lot?.["cbc:Name"]?.["#text"] || null,
          beschrijving: lot?.["cbc:Description"]?.["#text"] || null,
          cpv:
            lot?.["cac:MainCommodityClassification"]?.[
              "cbc:ItemClassificationCode"
            ]?.["#text"] || null,
          plaats:
            lot?.["cac:RealizedLocation"]?.["cbc:Description"]?.["#text"] ||
            null,
          duur:
            lot?.["cac:TenderingTerms"]?.["cbc:DurationMeasure"]?.["#text"] ||
            null,
        }));
      }
    } catch (e) {
      console.warn("Kon percelen niet parsen:", e);
    }

    return NextResponse.json({
      id,
      publication,
      documents,
      questions,
      lots, // <-- hier zie je straks perceel 5 uit je screenshot
      xmlData,
    });
  } catch (err: any) {
    console.error("TenderNed full fetch error:", err);
    return NextResponse.json(
      { error: "TenderNed API full fetch failed", details: err.message },
      { status: 500 }
    );
  }
}
