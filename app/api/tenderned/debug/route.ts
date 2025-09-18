import { NextResponse } from "next/server";

export async function GET() {
  const username = process.env.TN_USERNAME;
  const password = process.env.TN_PASSWORD;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Missing TN_USERNAME or TN_PASSWORD in environment variables" },
      { status: 500 }
    );
  }

  const url =
    "https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties?onlyGunningProcedure=true&pageSize=5";

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${username}:${password}`).toString("base64"),
        Accept: "application/xml",          // we vragen expliciet om XML
        "Content-Type": "application/xml",  // idem, zodat TenderNed niet klaagt
      },
    });

    const text = await response.text();

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      body: text.substring(0, 2000), // alleen eerste 2000 chars voor debug
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "TenderNed API request failed", details: error.message },
      { status: 500 }
    );
  }
}
