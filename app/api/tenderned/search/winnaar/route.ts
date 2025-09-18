// app/api/tenderned/search/winnaar/route.ts
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    if (!query) {
      return NextResponse.json({ error: "Missing ?q= parameter" }, { status: 400 });
    }

    const username = process.env.TENDERNED_USER;
    const password = process.env.TENDERNED_PASS;
    const baseUrl =
      process.env.TENDERNED_URL ||
      "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Missing env vars TENDERNED_USER / TENDERNED_PASS" },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    // Stap 1: Gegunde publicaties ophalen (beperk tot bv. laatste 50)
    const resp = await fetch(
      `${baseUrl}/publicaties?isGegund=true&pageSize=50`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!resp.ok) {
      return NextResponse.json(
        { error: "TenderNed list fetch failed", status: resp.status },
        { status: 500 }
      );
    }

    const list = await resp.json();
    const parser = new XMLParser({ ignoreAttributes: false });

    const matches: any[] = [];

    // Stap 2: Voor elke publicatie XML ophalen en checken
    for (const pub of list.content || []) {
      const xmlResp = await fetch(
        `${baseUrl}/publicaties/${pub.publicatieId}/public-xml`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "*/*",
          },
          cache: "no-store",
        }
      );

      if (!xmlResp.ok) continue;

      const xml = await xmlResp.text();
      const xmlData = parser.parse(xml);

      // Extract winnaars
      const orgs =
        xmlData?.ContractAwardNotice?.["efac:Organizations"]?.["efac:Organization"] || [];

      const arr = Array.isArray(orgs) ? orgs : [orgs];

      for (const org of arr) {
        const name = org?.["efac:Company"]?.["cac:PartyName"]?.["cbc:Name"]?.["#text"];
        if (name && name.toLowerCase().includes(query.toLowerCase())) {
          matches.push({
            publicatieId: pub.publicatieId,
            aanbestedingNaam: pub.aanbestedingNaam,
            opdrachtgeverNaam: pub.opdrachtgeverNaam,
            publicatieDatum: pub.publicatieDatum,
            winnaar: name,
          });
        }
      }
    }

    return NextResponse.json({ query, results: matches });
  } catch (err: any) {
    console.error("Winnaar search error", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
