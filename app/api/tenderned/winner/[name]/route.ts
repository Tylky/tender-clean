import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export async function GET(
  req: Request,
  { params }: { params: { name: string } }
) {
  const { name } = params;
  const username = process.env.TENDERNED_USERNAME!;
  const password = process.env.TENDERNED_PASSWORD!;
  const auth = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  try {
    // Zoek naar alle publicaties van de laatste periode (kun je uitbreiden met filters)
    const url = `https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties/search?onlyGunningProcedure=true&pageSize=20`;
    const res = await fetch(url, {
      headers: {
        Authorization: auth,
        Accept: "application/xml",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `TenderNed API error: ${res.statusText}`, status: res.status },
        { status: res.status }
      );
    }

    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const json = parser.parse(xml);

    // Bepaal of er resultaten zijn
    const results = json?.searchResult?.publicaties?.publicatie || [];
    const matched: any[] = [];

    // Doorloop elke publicatie
    for (const pub of results) {
      const detailUrl = `https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties/${pub.publicatieId}/public-xml`;
      const detailRes = await fetch(detailUrl, {
        headers: {
          Authorization: auth,
          Accept: "application/xml",
        },
      });
      if (!detailRes.ok) continue;

      const detailXml = await detailRes.text();
      const detailJson = parser.parse(detailXml);

      // Zoek winnaars in efac:Organizations
      const orgs =
        detailJson?.ContractAwardNotice?.["ext:UBLExtensions"]?.["ext:UBLExtension"]?.[
          "ext:ExtensionContent"
        ]?.["efext:EformsExtension"]?.["efac:Organizations"]?.["efac:Organization"] || [];

      const names = Array.isArray(orgs)
        ? orgs.map(
            (o: any) =>
              o?.["efac:Company"]?.["cac:PartyName"]?.["cbc:Name"]?.["#text"] || null
          )
        : [];

      // Check of een van de namen overeenkomt
      if (names.some((n: string | null) => n && n.toLowerCase().includes(name.toLowerCase()))) {
        matched.push({
          publicatieId: pub.publicatieId,
          aanbesteding: pub.aanbestedingNaam,
          opdrachtgever: pub.opdrachtgeverNaam,
          winnaarNamen: names.filter(Boolean),
        });
      }
    }

    return NextResponse.json({ query: name, results: matched });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
