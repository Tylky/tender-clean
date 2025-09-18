// app/api/tenderned/[id]/full/route.ts
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

function getAuthHeader() {
  const username = process.env.TENDERNED_USER;
  const password = process.env.TENDERNED_PASS;
  if (!username || !password) {
    throw new Error("Missing TenderNed credentials in env vars");
  }
  return (
    "Basic " + Buffer.from(`${username}:${password}`).toString("base64")
  );
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json;charset=UTF-8",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`JSON fetch failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function fetchXml(url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/xml",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`XML fetch failed ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  return parser.parse(text);
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    // Fetch alle tabjes parallel
    const [publication, documents, questions, xmlData] = await Promise.all([
      fetchJson(`${BASE_URL}/publicaties/${id}/publicatie`),
      fetchJson(`${BASE_URL}/publicaties/${id}/documenten`),
      fetchJson(`${BASE_URL}/publicaties/${id}/vragen`),
      fetchXml(`${BASE_URL}/publicaties/${id}/public-xml`),
    ]);

    return NextResponse.json({
      id,
      publication,
      documents,
      questions,
      xmlData,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "TenderNed API full fetch failed",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
