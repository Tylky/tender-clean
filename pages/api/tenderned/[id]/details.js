// pages/api/tenderned/[id]/details.js
import { XMLParser } from "fast-xml-parser";

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    const username = process.env.TENDERNED_USER;
    const password = process.env.TENDERNED_PASS;
    const baseUrl = process.env.TENDERNED_URL;

    if (!username || !password || !baseUrl) {
      return res.status(500).json({ error: "Missing env vars" });
    }

    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const headersJson = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    };
    const headersXml = {
      Authorization: `Basic ${auth}`,
      Accept: "application/xml",
    };

    // 1. Publicatie (via public-xml, omdat daar de tab "Publicatie" in zit)
    const pubResponse = await fetch(`${baseUrl}/publicaties/${id}/public-xml`, {
      headers: headersXml,
      cache: "no-store",
    });
    let publication = null;
    if (pubResponse.ok) {
      const xml = await pubResponse.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      publication = parser.parse(xml);
    }

    // 2. Documenten
    const docsResponse = await fetch(`${baseUrl}/publicaties/${id}/documenten`, {
      headers: headersJson,
      cache: "no-store",
    });
    const documents = docsResponse.ok ? await docsResponse.json() : null;

    // 3. Vraag & Antwoord
    const qaResponse = await fetch(
      `${baseUrl}/publicaties/${id}/vragen-en-antwoorden`,
      { headers: headersXml, cache: "no-store" }
    );
    let qa = null;
    if (qaResponse.ok) {
      const xml = await qaResponse.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      qa = parser.parse(xml);
    }

    // Alles combineren in één object
    return res.status(200).json({
      id,
      publication,
      documents,
      qa,
    });
  } catch (error) {
    console.error("TenderNed details fetch error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}
