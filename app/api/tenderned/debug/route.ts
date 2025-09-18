import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const TENDERNED_BASE_URL =
  "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";
const AUTH =
  "Basic " +
  Buffer.from(
    `${process.env.TENDERNED_USERNAME}:${process.env.TENDERNED_PASSWORD}`
  ).toString("base64");

export async function GET() {
  const parser = new XMLParser({ ignoreAttributes: false });
  const listUrl = `${TENDERNED_BASE_URL}/publicaties?onlyGunningProcedure=true&pageSize=10`; // klein houden om te debuggen

  try {
    const listResp = await fetch(listUrl, { headers: { Authorization: AUTH } });
    if (!listResp.ok) {
      return NextResponse.json({ error: "API fout bij lijst ophalen" });
    }

    const listXml = await listResp.text();
    const listData = parser.parse(listXml);
    const publicaties = listData?.publicaties?.publicatie || [];
    const ids = Array.isArray(publicaties)
      ? publicaties.map((p: any) => p.publicatieId)
      : [publicaties.publicatieId];

    const allNames: any[] = [];

    for (const id of ids) {
      const detailUrl = `${TENDERNED_BASE_URL}/publicaties/${id}/public-xml`;
      const detailResp = await fetch(detailUrl, { headers: { Authorization: AUTH } });
      if (!detailResp.ok) continue;

      const detailXml = await detailResp.text();
      const detail = parser.parse(detailXml);
      const contractNotice = detail?.ContractAwardNotice;
      if (!contractNotice) continue;

      const organizations =
        contractNotice?.["efac:Organizations"]?.["efac:Organization"] || [];
      const orgList = Array.isArray(organizations) ? organizations : [organizations];

      for (const org of orgList) {
        const company =
          org?.["efac:Company"]?.["cac:PartyName"]?.["cbc:Name"]?.["#text"];
        const tenderer =
          org?.["efac:Tenderer"]?.["cac:PartyName"]?.["cbc:Name"]?.["#text"];
        const tenderingParty =
          org?.["efac:TenderingParty"]?.["cac:PartyName"]?.["cbc:Name"]?.["#text"];

        allNames.push({
          publicatieId: id,
          company,
          tenderer,
          tenderingParty,
        });
      }
    }

    return NextResponse.json({ debuggedNames: allNames });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
