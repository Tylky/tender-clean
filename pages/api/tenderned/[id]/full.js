// pages/api/tenderned/[id]/full.js
import { XMLParser } from "fast-xml-parser";

// Helper voor veilige fetches
async function safeFetch(url, auth, accept = "application/json") {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: accept,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { error: `${res.status} ${res.statusText}` };
    }

    if (accept.includes("xml")) {
      const text = await res.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      return parser.parse(text);
    }

    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

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

    // --- Tabje Publicatie ---
    const publication = await safeFetch(`${baseUrl}/publicaties/${id}`, auth);

    // --- Tabje Documenten ---
    const documents = await safeFetch(
      `${baseUrl}/publicaties/${id}/documenten`,
      auth
    );

    // --- Tabje Vragen & Antwoorden ---
    const questions = await safeFetch(
      `${baseUrl}/publicaties/${id}/vragenenantwoorden`,
      auth
    );

    // --- Tabje XML (full) ---
    const publicationXml = await safeFetch(
      `${baseUrl}/publicaties/${id}/public-xml`,
      auth,
      "application/xml"
    );

    return res.status(200).json({
      id,
      publication,
      documents,
      questions,
      publicationXml,
    });
  } catch (error) {
    console.error("TenderNed full fetch error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
