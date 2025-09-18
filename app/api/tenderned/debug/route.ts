import { NextResponse } from "next/server";

const BASE_URL = "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

export async function GET() {
  const username = process.env.TENDERNED_USERNAME!;
  const password = process.env.TENDERNED_PASSWORD!;

  try {
    // Haal de eerste 10 gunningspublicaties op
    const res = await fetch(
      `${BASE_URL}/publicaties/search?onlyGunningProcedure=true&pageSize=10`,
      {
        headers: {
          Accept: "application/xml",
        },
        // Basic auth
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${username}:${password}`).toString("base64"),
          Accept: "application/xml",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({
        error: `TenderNed API error: ${res.status} ${res.statusText}`,
      });
    }

    const xml = await res.text();

    // Pak de PartyName blokken eruit
    const matches = [...xml.matchAll(/<cac:PartyName>[\s\S]*?<\/cac:PartyName>/g)];

    const parsed = matches.map((m) => {
      // Extract de <cbc:Name> inhoud
      const nameMatch = m[0].match(/<cbc:Name[^>]*>([^<]+)<\/cbc:Name>/);
      return {
        raw: m[0],
        name: nameMatch ? nameMatch[1].trim() : null,
      };
    });

    return NextResponse.json({
      count: parsed.length,
      results: parsed,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: "TenderNed API call failed",
      details: err.message,
    });
  }
}
