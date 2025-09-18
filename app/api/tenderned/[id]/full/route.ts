// app/api/tenderned/[id]/full/route.ts
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const username = process.env.TENDERNED_USER;
    const password = process.env.TENDERNED_PASS;
    const baseUrl =
      process.env.TENDERNED_URL ||
      "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Missing TENDERNED_USER or TENDERNED_PASS in environment variables" },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    // ✅ helper als const arrow function
    const fetchJson = async (url: string) => {
      const res = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (!res.ok) return null;
      return res.json();
    };

    // 1. Publication details
    const publication = await fetchJson(`${baseUrl}/publicaties/${id}`);

    // 2. Documenten
    const documents = await fetchJson(`${baseUrl}/publicaties/${id}/documenten`);

    // 3. Vragen & Antwoorden
    const questions = await fetchJson(`${baseUrl}/publicaties/${id}/vragen`);

    // 4. XML fallback
    let xmlData = null;
    const xmlRes = await fetch(`${baseUrl}/publicaties/${id}/public-xml`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "*/*", // belangrijk, anders 406
      },
      cache: "no-store",
    });
    if (xmlRes.ok) {
      const xmlText = await xmlRes.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      xmlData = parser.parse(xmlText);
    }

    if (!publication && !documents && !questions && !xmlData) {
      return NextResponse.json(
        { error: "Geen gegevens gevonden voor publicatie", id },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id,
      publication,
      documents,
      questions,
      xmlData,
    });
  } catch (error: any) {
    console.error("TenderNed API full fetch error:", error);
    return NextResponse.json(
      { error: "TenderNed API full fetch failed", details: error.message },
      { status: 500 }
    );
  }
}
