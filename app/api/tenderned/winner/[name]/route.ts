// route.ts
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";
const AUTH = "Basic " + Buffer.from(`${process.env.TENDERNED_USER}:${process.env.TENDERNED_PASS}`).toString("base64");

export async function GET(
  req: Request,
  { params }: { params: { name: string } }
) {
  const { name } = params;
  try {
    // Stap 1: publicaties ophalen via TenderNed GET
    const publicatiesUrl = `${BASE_URL}/publicaties?page=0&size=50&onlyGunningProcedure=true`;
    const resp = await fetch(publicatiesUrl, {
      headers: {
        Authorization: AUTH,
        Accept: "application/xml"  // volg voorbeeldcode: XML
      }
    });

    if (!resp.ok) {
      return NextResponse.json({
        error: `TenderNed API error publicaties: ${resp.status} ${resp.statusText}`
      }, { status: resp.status });
    }

    const xmlPublicaties = await resp.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const jsonPublicaties = parser.parse(xmlPublicaties);

    // Haal de publicaties uit JSON
    let pubs = jsonPublicaties?.publicaties?.publicatie;
    if (!pubs) {
      return NextResponse.json({ results: [] });
    }
    if (!Array.isArray(pubs)) {
      pubs = [pubs];
    }

    const results: any[] = [];

    // Stap 2: Voor elke publicatie de details ophalen
    for (const pub of pubs) {
      const pubId = pub.publicatieId;
      if (!pubId) continue;

      const detailUrl = `${BASE_URL}/publicaties/${pubId}/public-xml`;
      const detailResp = await fetch(detailUrl, {
        headers: {
          Authorization: AUTH,
          Accept: "application/xml"
        }
      });

      if (!detailResp.ok) continue;

      const detailXml = await detailResp.text();
      const detailJson = parser.parse(detailXml);

      // In TenderNed voorbeeldcode: hierin zitten de winnende partij(ijen)
      const orgs = detailJson?.ContractAwardNotice
        ?.["ext:UBLExtensions"]?.["ext:UBLExtension"]
        ?.["ext:ExtensionContent"]?.["efext:EformsExtension"]
        ?.["efac:Organizations"]?.["efac:Organization"];

      if (!orgs) continue;

      const orgArray = Array.isArray(orgs) ? orgs : [orgs];
      for (const org of orgArray) {
        const winnerName = org?.["efac:Company"]
          ?.["cac:PartyName"]
          ?.["cbc:Name"]
          ?.["#text"];
        if (winnerName && winnerName.toLowerCase().includes(name.toLowerCase())) {
          results.push({
            publicatieId: pubId,
            aanbestedingNaam: pub.aanbestedingNaam || pub.titel || null,
            opdrachtgeverNaam: pub.opdrachtgeverNaam || null,
            winnaar: winnerName
          });
          // je kunt hier break; als je alleen 1 match per publicatie wilt
        }
      }
    }

    return NextResponse.json({ query: name, results });
  } catch (error: any) {
    console.error("Error in winner route:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error.message
    }, { status: 500 });
  }
}
