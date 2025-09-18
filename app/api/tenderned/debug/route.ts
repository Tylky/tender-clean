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

  const url = "https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties?onlyGunningProcedure=true&pageSize=1";

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
        Accept: "application/xml", // TenderNed wil XML
      },
      cache: "no-store",
      redirect: "follow",
    });

    const text = await res.text();

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type"),
      bodySample: text.slice(0, 500), // alleen eerste 500 chars om response te inspecteren
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "TenderNed API error (debug)", details: err.message },
      { status: 500 }
    );
  }
}
