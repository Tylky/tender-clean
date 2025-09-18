import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    // ✅ Helper functie voor JSON fetch
    const fetchJson = async (url: string) => {
      const res = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (!res.ok) return null;
      return res.json();
    };

    // ✅ Stap 1: hoofd-publicatie JSON
    const publication = await fetchJson(`${baseUrl}/publicaties/${id}`);

    // ✅ Stap 2: documenten
    const documents = await fetchJson(
      `${baseUrl}/publicaties/${id}/documenten`
    );

    // ✅ Stap 3: vragen & antwoorden
    const questions = await fetchJson(
      `${baseUrl}/publicaties/${id}/vragen-en-antwoorden`
    );

    // ✅ Stap 4: publicatie XML
    let xmlData = null;
    try {
      const xmlResp = await fetch(`${baseUrl}/publicaties/${id}/public-xml`, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "*/*",
        },
        cache: "no-store",
      });

      if (xmlResp.ok) {
        const xml = await xmlResp.text();
        const parser = new XMLParser({ ignoreAttributes: false });
        xmlData = parser.parse(xml);
      }
    } catch (err) {
      console.error("XML fetch/parsing error:", err);
    }

    // ✅ Stap 5: extract lots (percelen) uit XML
    let lots: any[] = [];
    try {
      const lotData =
        xmlData?.ContractAwardNotice?.["cac:ProcurementProjectLot"];
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

    // ✅ Combineer alle data in één response
    return NextResponse.json({
      id,
      publication,
      documents,
      questions,
      lots,
      xmlData,
    });
  } catch (error: any) {
    console.error("TenderNed API full fetch failed:", error);
    return NextResponse.json(
      { error: "TenderNed API full fetch failed", details: error.message },
      { status: 500 }
    );
  }
}
