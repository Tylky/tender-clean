// app/api/tenderned/[id]/full/route.ts
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export async function GET(
  request: Request,
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
      {
        error: "Missing TENDERNED_USER or TENDERNED_PASS in environment variables",
      },
      { status: 500 }
    );
  }

  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    // --- Stap 1: JSON fetch ---
    const pubUrl = `${baseUrl}/publicaties/${id}`;
    const pubResp = await fetch(pubUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    let publication: any = null;
    if (pubResp.ok) {
      publication = await pubResp.json();
    }

    // --- Stap 2: Documenten ---
    const docUrl = `${baseUrl}/publicaties/${id}/documenten`;
    const docResp = await fetch(docUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    let documents: any = null;
    if (docResp.ok) {
      documents = await docResp.json();
    }

    // --- Stap 3: Questions (Nota's van inlichtingen) ---
    const qUrl = `${baseUrl}/publicaties/${id}/vragen`;
    const qResp = await fetch(qUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    let questions: any = null;
    if (qResp.ok) {
      const qJson = await qResp.json();
      questions = (qJson.vragen || []).map((q: any) => ({
        vraag: q.vraag || null,
        antwoord: q.antwoord || null,
        indiener: q.indienerNaam || null,
        datum: q.datum || null,
      }));
    }

    // --- Stap 4: XML ---
    const xmlUrl = `${baseUrl}/publicaties/${id}/public-xml`;
    const xmlResp = await fetch(xmlUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "*/*",
      },
      cache: "no-store",
    });

    let xmlData: any = null;
    if (xmlResp.ok) {
      const xml = await xmlResp.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      xmlData = parser.parse(xml);
    }

    // --- Stap 5: Lots (percelen) uit XML ---
    let lots: any[] = [];
    try {
      const contractNotice: any = (xmlData as any)?.ContractAwardNotice;
      const lotData: any =
        contractNotice?.["cac:ProcurementProjectLot"];
      const arr = Array.isArray(lotData) ? lotData : lotData ? [lotData] : [];

      lots = arr.map((lot: any) => {
        const project = lot?.["cac:ProcurementProject"] || {};
        return {
          id: lot?.["cbc:ID"]?.["#text"] || null,
          titel: project?.["cbc:Name"]?.["#text"] || null,
          beschrijving: project?.["cbc:Description"]?.["#text"] || null,
          cpv:
            project?.["cac:MainCommodityClassification"]?.[
              "cbc:ItemClassificationCode"
            ]?.["#text"] || null,
          plaats:
            project?.["cac:RealizedLocation"]?.["cbc:Description"]?.["#text"] ||
            null,
          duur:
            project?.["cac:PlannedPeriod"]?.["cbc:DurationMeasure"]?.["#text"] ||
            null,
        };
      });
    } catch (err) {
      console.error("Lot parsing error:", err);
    }

    // --- Combineer en return ---
    return NextResponse.json({
      id,
      publication,
      documents,
      questions,
      lots,
      xmlData,
    });
  } catch (err: any) {
    console.error("TenderNed API full fetch failed:", err);
    return NextResponse.json(
      { error: "TenderNed API full fetch failed", details: err.message },
      { status: 500 }
    );
  }
}
