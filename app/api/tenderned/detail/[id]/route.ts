import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { TENDER_USER, TENDER_PASS } = process.env as Record<string, string>;
  if (!TENDER_USER || !TENDER_PASS) {
    return NextResponse.json({ error: "Missing TenderNed credentials" }, { status: 500 });
  }

  const auth = "Basic " + Buffer.from(`${TENDER_USER}:${TENDER_PASS}`).toString("base64");
  const url = `https://www.tenderned.nl/papi/tenderned-rs-xml/publicaties/${params.id}/public-xml`;

  const res = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/xml" },
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    return NextResponse.json(
      { error: "TenderNed XML API error", status: res.status, preview: text.slice(0, 500) },
      { status: res.status }
    );
  }

  return new NextResponse(text, { headers: { "Content-Type": "application/xml" } });
}
