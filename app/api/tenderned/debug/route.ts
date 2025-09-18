// app/api/tenderned/debug/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const username = process.env.TENDERNED_USER;
  const password = process.env.TENDERNED_PASS;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Missing TENDERNED_USER or TENDERNED_PASS in environment variables" },
      { status: 500 }
    );
  }

  // Test: pak 1 publicatie op met onlyGunningProcedure
  const url =
    "https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties?onlyGunningProcedure=true&pageSize=1";

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${username}:${password}`).toString("base64"),
        Accept: "application/xml;charset=UTF-8",
      },
      cache: "no-store",
      redirect: "follow",
    });

    const text = await res.text();

    // Verzamel alle response headers
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return NextResponse.json({
      request: {
        url,
        headers: {
          Authorization: "[REDACTED]", // niet loggen ivm veiligheid
          Accept: "application/xml;charset=UTF-8",
        },
      },
      response: {
        status: res.status,
        ok: res.ok,
        headers,
        body: text, // hele body tonen (kan groot zijn!)
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "TenderNed API error (debug)", details: err.message },
      { status: 500 }
    );
  }
}
