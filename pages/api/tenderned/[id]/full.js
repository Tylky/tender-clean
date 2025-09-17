// pages/api/tenderned/[id]/full.js
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

    // --- Stap 1: probeer JSON van /publicaties/{id} ---
    const jsonUrl = `${baseUrl}/publicaties/${id}`;
    const jsonResp = await fetch(jsonUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    let publication = null;
    if (jsonResp.ok) {
      publication = await jsonResp.json();
    }

    // --- Stap 2: fallback naar public-xml als JSON niet genoeg is ---
    let publicationXml = null;
    const xmlUrl = `${baseUrl}/publicaties/${id}/public-xml`;
    const xmlResp = await fetch(xmlUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "*/*", // breder, TenderNed accepteert dit vaak
      },
      cache: "no-store",
    });

    if (xmlResp.ok) {
      const xml = await xmlResp.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      publicationXml = parser.parse(xml);
    }

    if (!publication && !publicationXml) {
      return res.status(404).json({
        error: "Geen details gevonden voor deze publicatie",
        id,
      });
    }

    return res.status(200).json({
      id,
      publication, // JSON detail van /publicaties/{id}
      publicationXml, // fallback XML (geparsed naar JSON)
    });
  } catch (error) {
    console.error("TenderNed full fetch error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
