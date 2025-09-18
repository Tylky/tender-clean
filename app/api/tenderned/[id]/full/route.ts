import { NextResponse } from "next/server";

const BASE_URL = "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const username = process.env.TENDERNED_USER;
  const password = process.env.TENDERNED_PASS;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Missing TENDERNED_USER or TENDERNED_PASS" },
      { status: 500 }
    );
  }

  const authHeader =
    "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  try {
    // --- Stap 1: JSON ophalen ---
    const jsonRes = await fetch(`${BASE_URL}/publicaties/${id}`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!jsonRes.ok) {
      return NextResponse.json(
        {
          error: `TenderNed JSON error: ${jsonRes.statusText}`,
          status: jsonRes.status,
        },
        { status: jsonRes.status }
      );
    }

    const jsonData = await jsonRes.json();

    // --- Stap 2: XML ophalen ---
    const xmlRes = await fetch(`${BASE_URL}/publicaties/${id}/public-xml`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/xml",
      },
      cache: "no-store",
    });

    let xmlText = "";
    if (xmlRes.ok) {
      xmlText = await xmlRes.text();
    }

    // --- Stap 3: JSON + XML combineren ---
    return NextResponse.json({
      id,
      json: jsonData,
      xml: xmlText, // ruwe XML meegeven zodat frontend alles kan parsen
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
