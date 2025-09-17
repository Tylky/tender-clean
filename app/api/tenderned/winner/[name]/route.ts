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

  const parser = new XMLParser({ ignoreAttributes: false });

  try {
    // Stap 1: zoek gunning-publicaties
    const searchUrl =
      "https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties/search?onlyGunningProcedure=true&pageSize=10";

    let searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: auth,
        Accept: "application/xml;charset=UTF-8",
      },
      cache: "no-store",
    });

    // fallback naar JSON
    if (!searchRes.ok) {
      searchRes = await fetch(searchUrl, {
        headers: {
          Authorization: auth,
          Accept: "application/json",
        },
      });
    }

    if (!searchRes.ok) {
      return NextResponse.json(
        { error: `TenderNed API error: ${searchRes.statusText}`, status: searchRes.status },
        { status: searchRes.status }
      );
    }

    const searchText = await searchRes.text();
    const searchJson = parser.parse(searchText);

    const results = searchJson?.searchResult?.publicaties?.publicatie || [];
    const matched: any[] = [];

    // Stap 2: loop door publicaties
    for (const pub of results) {
      const detailUrl = `https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties/${pub.publicatieId}/public-xml`;

      let detailRes = await fetch(detailUrl, {
        headers: {
          Authorization: auth,
          Accept: "application/xml;charset=UTF-8",
        },
      });

      if (!detailRes.ok) {
        detailRes = await fetch(detailUrl, {
          headers: {
            Authorization: auth,
            Accept: "application/json",
          },
        });
      }

      if (!detailRes.ok) continue;

      const detailText = await detailRes.text();
      const detailJson = parser.parse(detailText);

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
