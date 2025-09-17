// pages/api/tenderned/winner/[name].js
import { XMLParser } from "fast-xml-parser";

export default async function handler(req, res) {
  try {
    const { name } = req.query; // partijnaam die we zoeken
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

    // --- Stap 1: zoek naar gunningsberichten ---
    // TenderNed API heeft een /publicaties endpoint, vaak met type=Award
    const url = `${baseUrl}/publicaties?type=Award&size=50&page=0&zoekterm=${encodeURIComponent(
      name
    )}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `TenderNed API error: ${response.statusText}`,
        status: response.status,
        url,
      });
    }

    const data = await response.json();

    // --- Stap 2: optioneel: XML-detail per publicatie ophalen ---
    const parser = new XMLParser({ ignoreAttributes: false });
    const details = [];

    for (const pub of data._embedded?.publicaties || []) {
      try {
        const detailResp = await fetch(
          `${baseUrl}/publicaties/${pub.id}/public-xml`,
          {
            headers: {
              Authorization: `Basic ${auth}`,
              Accept: "*/*",
            },
          }
        );

        if (detailResp.ok) {
          const xml = await detailResp.text();
          const parsedXml = parser.parse(xml);

          details.push({
            id: pub.id,
            title: pub.titel,
            date: pub.datumPublicatie,
            value: parsedXml?.ContractAwardNotice?.EstimatedValue || null,
            awardees: parsedXml?.ContractAwardNotice?.AwardedTenderers || null,
            raw: parsedXml,
          });
        }
      } catch (e) {
        console.error("Error fetching detail:", e.message);
      }
    }

    return res.status(200).json({
      search: name,
      count: details.length,
      results: details,
    });
  } catch (error) {
    console.error("TenderNed winner search error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
