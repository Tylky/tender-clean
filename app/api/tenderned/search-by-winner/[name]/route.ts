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
  const parser = new XMLParser({ ignoreAttributes: false });

  try {
    // 👉 Haal laatste gegunde publicaties op
    const listUrl = `${TENDERNED_BASE_URL}/publicaties?onlyGunningProcedure=true&pageSize=25`;

    const listResp = await fetch(listUrl, {
      headers: {
        Authorization: AUTH,
      },
    });

    if (!listResp.ok) {
      return NextResponse.json(
        {
          error: `TenderNed API error list: ${listResp.status} ${listResp.statusText}`,
          status: listResp.status,
        },
        { status: listResp.status }
      );
    }

    const listXml = await listResp.text();
    const listData = parser.parse(listXml);
    const publicaties = listData?.publicaties?.publicatie || [];
    const ids = Array.isArray(publicaties)
      ? publicaties.map((p: any) => p.publicatieId)
      : [publicaties.publicatieId];

    const results: any[] = [];

    // 👉 Check elke publicatie in detail
    for (const id of ids) {
      const detailUrl = `${TENDERNED_BASE_URL}/publicaties/${id}/public-xml`;

      const detailResp = await fetch(detailUrl, {
        headers: {
          Authorization: AUTH,
        },
      });

      if (!detailResp.ok) continue;

      const detailXml = await detailResp.text();
      const detail = parser.parse(detailXml);

      const contractNotice = detail?.ContractAwardNotice;
      if (!contractNotice) continue;

      // Organisaties (kopers en winnaars)
      const orgs =
        contractNotice?.["efac:Organizations"]?.["efac:Organization"] || [];
      const organizations = Array.isArray(orgs) ? orgs : [orgs];

      for (const org of organizations) {
        const partyName =
          org?.["efac:Company"]?.["cac:PartyName"]?.["cbc:Name"]?.["#text"];
        if (partyName && partyName.toLowerCase().includes(searchName)) {
          results.push({
            publicatieId: id,
            name: partyName,
            title:
              contractNotice?.["efac:SettledContract"]?.["cbc:Title"]?.["#text"] ||
              null,
            value:
              contractNotice?.["efac:SettledContract"]?.[
                "cac:LegalMonetaryTotal"
              ]?.["cbc:PayableAmount"]?.["#text"] || null,
            date:
              contractNotice?.["efac:SettledContract"]?.["cbc:IssueDate"] ||
              null,
          });
        }
      }
    }

    return NextResponse.json({
      search: searchName,
      count: results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
