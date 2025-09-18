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

  const url =
    "https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties?onlyGunningProcedure=true&pageSize=1";

  const variants = [
    { label: "xml", headers: { Accept: "application/xml" } },
    { label: "textxml", headers: { Accept: "text/xml" } },
    { label: "none", headers: {} },
  ];

  const results: any[] = [];

  for (const variant of variants) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${username}:${password}`).toString("base64"),
          ...variant.headers,
        },
        cache: "no-store",
      });

      const text = await res.text();

      results.push({
        variant: variant.label,
        status: res.status,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries()),
        bodySample: text.slice(0, 300),
      });
    } catch (err: any) {
      results.push({
        variant: variant.label,
        error: err.message,
      });
    }
  }

  return NextResponse.json({ url, results });
}
