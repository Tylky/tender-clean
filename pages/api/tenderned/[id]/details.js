// pages/api/tenderned/[id]/details.js
import { XMLParser } from "fast-xml-parser";

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    const username = process.env.TENDERNED_USER;
    const password = process.env.TENDERNED_PASS;
    const baseUrl =
      process.env.TENDERNED_URL ||
      "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

    if (!username || !password || !baseUrl) {
      return res.status(500).json({
        error: "Missing env vars: TENDERNED_USER, TENDERNED_PASS, TENDERNED_URL",
      });
    }

    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const headersJson = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    };
    const headersXml = {
      Authorization: `Basic ${auth}`,
      Accept: "*/*", // belangrijk voor public-xml en Q&A
    };

    // --- Publicatie details (JSON) ---
    let publication = null;
    const pubResp = await fetch(`${baseUrl}/publicaties/${id}`, {
      headers: headersJson,
      cache: "no-store",
    });
    if (pubResp.ok) {
      publication = await pubResp.json();
    }

    // --- Publicatie tekst (XML fallback) ---
    let publicationXml = null;
    const pubXmlResp = await fetch(`${baseUrl}/publicaties/${id}/public-xml`, {
      headers: headersXml,
      cache: "no-store",
    });
    if (pubXmlResp.ok) {
      const xml = await pubXmlResp.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      publicationXml = parser.parse(xml);
    }

    // --- Documenten ---
    let documents = null;
    const docsResp = await fetch(`${baseUrl}/publicaties/${id}/documenten`, {
      headers: headersJson,
      cache: "no-store",
    });
    if (docsResp.ok) {
      documents = await docsResp.json();
    }

    // --- Vraag & Antwoord ---
    let qa = null;
    const qaResp = await fetch(`${baseUrl}/publicaties/${id}/vragen-en-antwoorden`, {
      headers: headersXml,
      cache: "no-store",
    });
    if (qaResp.ok) {
      const xml = await qaResp.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      qa = parser.parse(xml);
    }

    // --- Alles combineren ---
    return res.status(200).json({
      id,
      publication,    // JSON metadata
      publicationXml, // Volledige tekst (uit XML)
      documents,      // Bijlagen
      qa              // Vraag & Antwoord
    });
  } catch (error) {
    console.error("TenderNed details fetch error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
