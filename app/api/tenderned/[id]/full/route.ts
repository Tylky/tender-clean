// app/api/tenderned/[id]/full/route.ts
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const username = process.env.TENDERNED_USER;
  const password = process.env.TENDERNED_PASS;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Missing TenderNed credentials" },
      { status: 500 }
    );
  }

  const authHeader =
    "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  const url = `${BASE_URL}/publicaties/${params.id}`;

  try {
    // Eerste poging: JSON
    let res = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json;charset=UTF-8",
      },
    });

    let body: any;
    let contentType = res.headers.get("content-type") || "";

    if (res.status === 406 || !contentType.includes("json")) {
      // Tweede poging: XML
      res = await fetch(url, {
        headers: {
          Authorization: authHeader,
          Accept: "application/xml;charset=UTF-8",
        },
      });

      if (!res.ok) {
        throw new Error(`Fallback XML fetch failed: ${res.status}`);
      }

      const xmlText = await res.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      body = parser.parse(xmlText);
    } else {
      body = await res.json();
    }

    // Optioneel: documenten ophalen
    let documents: any[] = [];
    try {
      const docsUrl = `${BASE_URL}/publicaties/${params.id}/documenten`;
      const docsRes = await fetch(docsUrl, {
        headers: { Authorization: authHeader, Accept: "application/json" },
      });
      if (docsRes.ok) {
        documents = await docsRes.json();
      }
    } catch (e) {
      console.warn("Document fetch failed", e);
    }

    // Optioneel: vragen ophalen
    let questions: any[] = [];
    try {
      const qUrl = `${BASE_URL}/publicaties/${params.id}/vragen`;
      const qRes = await fetch(qUrl, {
        headers: { Authorization: authHeader, Accept: "application/json" },
      });
      if (qRes.ok) {
        questions = await qRes.json();
      }
    } catch (e) {
      console.warn("Question fetch failed", e);
    }

    return NextResponse.json({
      id: params.id,
      publication: body,
      documents,
      questions,
    });
  } catch (error: any) {
    console.error("Full fetch error", error);
    return NextResponse.json(
      {
        error: "TenderNed API full fetch failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
