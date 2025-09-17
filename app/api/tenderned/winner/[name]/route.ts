import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const TENDERNED_BASE_URL =
  "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";
const AUTH =
  "Basic " +
  Buffer.from(
    `${process.env.TENDERNED_USERNAME}:${process.env.TENDERNED_PASSWORD}`
  ).toString("base64");

async function fetchWithFallback(url: string) {
  const headersList = [
    "application/xml;charset=UTF-8",
    "application/xml",
    "text/xml",
  ];

  for (const accept of headersList) {
    const resp = await fetch(url, {
      headers: {
        Authorization: AUTH,
        Accept: accept,
      },
    });

    if (resp.ok) {
      return resp; // ✅ gelukt
    }

    if (resp.status !== 406) {
      // Alleen bij 406 doorgaan met fallback
      throw new Error(`TenderNed error: ${resp.status} ${resp.statusText}`);
    }
  }

  throw new Error("TenderNed API blijft 406 geven voor alle Accept headers");
}

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  const searchName = params.name.toLowerCase();
  const parser = new XMLParser({ ignoreAttributes: false });

  try {
    const publicatiesUrl = `${TENDERNED_BASE_URL}/publicaties?onlyGunningProcedure=true&pageSize=50`;

    const resp = await fetchWithFallback(publicatiesUrl);
    const xmlText = await resp.text();
    const data = parser.parse(xmlText);

    const publicaties =
      data?.publicaties?.publicatie || data?.publicatie || [];
    const ids = Array.isArray(publicaties)
      ? publicaties.map((p: any) => p.publicatieId)
      : [publicaties.publicatieId];

    const results: any[] = [];

    for (const id of ids) {
      const detailUrl = `${TENDERNED_BASE_URL}/publicaties/${id}/public-xml`;
      const detailResp = await fetchWithFallback(detailUrl);

      const detailXml = await detailResp.text();
      const detail = parser.parse(detailXml);

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
