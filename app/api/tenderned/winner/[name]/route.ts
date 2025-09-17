import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const TENDERNED_BASE_URL =
  "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";
const AUTH =
  "Basic " +
  Buffer.from(
    `${process.env.TENDERNED_USERNAME}:${process.env.TENDERNED_PASSWORD}`
  ).toString("base64");

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  const searchName = params.name.toLowerCase();

  try {
    // 1. Zoek publicaties met gunning
    const publicatiesUrl = `${TENDERNED_BASE_URL}/publicaties?onlyGunningProcedure=true&pageSize=50`;

    const resp = await fetch(publicatiesUrl, {
      headers: {
        Authorization: AUTH,
        Accept: "application/xml;charset=UTF-8", // ✅ heel precies
      },
    });

    if (!resp.ok) {
      return NextResponse.json(
        {
          error: `TenderNed API error publicaties: ${resp.statusText}`,
          status: resp.status,
        },
        { status: resp.status }
      );
    }

    const xmlText = await resp.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const data = parser.parse(xmlText);

    // Publicatie IDs ophalen
    const publicaties =
      data?.publicaties?.publicatie || data?.publicatie || [];

    const ids = Array.isArray(publicaties)
      ? publicaties.map((p: any) => p.publicatieId)
      : [publicaties.publicatieId];

    const results: any[] = [];

    // 2. Loop door alle publicatie IDs
    for (const id of ids) {
      const detailUrl = `${TENDERNED_BASE_URL}/publicaties/${id}/public-xml`;

      const detailResp = await fetch(detailUrl, {
        headers: {
          Authorization: AUTH,
          Accept: "application/xml;charset=UTF-8", // ✅ idem
        },
      });

      if (!detailResp.ok) continue;

      const detailXml = await detailResp.text();
      const detail = parser.parse(detailXml);

      // Zoek winnaar (PartyName)
      const orgs =
        detail?.ContractAwardNotice?.["efac:Organizations"]?.[
          "efac:Organization"
        ] || [];

      const organizations = Array.isArray(orgs) ? orgs : [orgs];

      for (const org of organizations) {
        const partyName =
          org?.["efac:Company"]?.["cac:PartyName"]?.["cbc:Name"]?.["#text"];

        if (partyName && partyName.toLowerCase().includes(searchName)) {
          results.push({
            publicatieId: id,
            name: partyName,
            website: org?.["efac:Company"]?.["cbc:WebsiteURI"] || null,
            address: org?.["efac:Company"]?.["cac:PostalAddress"] || null,
          });
        }
      }
    }

    return NextResponse.json({ search: searchName, results });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
