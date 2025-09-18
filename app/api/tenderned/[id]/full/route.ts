import { NextResponse } from "next/server";

const BASE_URL = "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

function getAuthHeader() {
  const username = process.env.TENDERNED_USER!;
  const password = process.env.TENDERNED_PASS!;
  return (
    "Basic " + Buffer.from(`${username}:${password}`).toString("base64")
  );
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json;charset=UTF-8",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchXml(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/xml;charset=UTF-8",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Basisinfo
    const publication = await fetchJson(`${BASE_URL}/publicaties/${id}`);

    // XML (detail)
    const publicationXml = await fetchXml(
      `${BASE_URL}/publicaties/${id}/public-xml`
    );

    // Documenten
    let documents: any[] = [];
    try {
      documents = await fetchJson(`${BASE_URL}/publicaties/${id}/documenten`);
    } catch (e) {
      documents = [];
    }

    // Q&A
    let vragen: any[] = [];
    let antwoorden: any[] = [];
    try {
      vragen = await fetchJson(`${BASE_URL}/publicaties/${id}/vragen`);
    } catch (e) {
      vragen = [];
    }
    try {
      antwoorden = await fetchJson(`${BASE_URL}/publicaties/${id}/antwoorden`);
    } catch (e) {
      antwoorden = [];
    }

    return NextResponse.json({
      id,
      publication,
      publicationXml,
      documents,
      qa: {
        vragen,
        antwoorden,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "TenderNed API full fetch failed", details: err.message },
      { status: 500 }
    );
  }
}
