// pages/api/tenderned/[id]/qa.js
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
    const url = `${baseUrl}/publicaties/${id}/vragen-en-antwoorden`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/xml", // Q&A is vaak alleen in XML beschikbaar
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `TenderNed API error: ${response.statusText}`,
        status: response.status,
        url,
      });
    }

    const xml = await response.text();

    // XML omzetten naar JSON
    const parser = new XMLParser({ ignoreAttributes: false });
    const jsonData = parser.parse(xml);

    return res.status(200).json(jsonData);
  } catch (error) {
    console.error("TenderNed Q&A fetch error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
