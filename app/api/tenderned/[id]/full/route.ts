// app/api/tenderned/[id]/full/route.ts
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

function getAuthHeader() {
  const username = process.env.TENDERNED_USER;
  const password = process.env.TENDERNED_PASSWORD;
  if (!username || !password) {
    throw new Error("Missing TENDERNED_USER or TENDERNED_PASSWORD in environment variables");
  }
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`JSON fetch failed ${res.status}: ${res.statusText}`);
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
    throw new Error(`XML fetch failed ${res.status}: ${res.statusText}`);
  }
  const text = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(text);
}

// Fouttolerante wrappers
async function safeFetchJson(url: string) {
  try {
    return await fetchJson(url);
  } catch (err: any) {
    if (err.message.includes("404")) return null;
    return { error: err.message };
  }
}

async function safeFetchXml(url: string) {
  try {
    return await fetchXml(url);
  } catch (err: any) {
    if (err.message.includes("404")) return null;
    return { error: err.message };
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const [publication, documents, questions, xmlData] = await Promise.all([
      safeFetchJson(`${BASE_URL}/publicaties/${id}/publicatie`),
      safeFetchJson(`${BASE_URL}/publicaties/${id}/documenten`),
      safeFetchJson(`${BASE_URL}/publicaties/${id}/vragen`),
      safeFetchXml(`${BASE_URL}/publicaties/${id}/public-xml`),
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
