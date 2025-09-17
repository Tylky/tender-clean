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
      Accept: "*/*",
    };

    // --- Publicatie details (JSON basisinfo) ---
    let publication = null;
    const pubResp = await fetch(`${baseUrl}/publicaties/${id}`, {
      headers: headersJson,
      cache: "no-store",
    });
    if (pubResp.ok) {
      publication = await pubResp.json();
    }

    // --- Publicatie XML (uitgebreide inhoud) ---
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

    // --- Parsed velden uit de XML (voorbeeld, afhankelijk van XML-structuur) ---
    let parsed = {};
    if (publicationXml) {
      try {
        const notice = publicationXml?.ContractNotice || publicationXml?.ContractAwardNotice;

        parsed = {
          buyer: {
            officialName: notice?.Buyer?.OfficialName || null,
            legalForm: notice?.Buyer?.LegalForm || null,
            activity: notice?.Buyer?.Activity || null,
          },
          procedure: {
            title: notice?.Procedure?.Title || null,
            description: notice?.Procedure?.Description || null,
            procedureType: notice?.Procedure?.Type || null,
            contractType: notice?.Procedure?.ContractType || null,
            cpvCodes: notice?.Procedure?.CPVCodes || [],
            estimatedValue: notice?.Procedure?.EstimatedValue || null,
            duration: {
              start: notice?.Procedure?.Duration?.StartDate || null,
              end: notice?.Procedure?.Duration?.EndDate || null,
            },
          },
          awardCriteria: Array.isArray(notice?.AwardCriteria?.Criterion)
            ? notice.AwardCriteria.Criterion.map((c) => ({
                type: c.Type,
                name: c.Name,
                description: c.Description,
                weight: c["Gunningscriterium numerieke waarde"] || null,
              }))
            : [],
        };
      } catch (e) {
        console.error("Parsing error:", e.message);
      }
    }

    // --- Alles combineren ---
    return res.status(200).json({
      id,
      publication,
      publicationXml,
      documents,
      qa,
      parsed,
    });
  } catch (error) {
    console.error("TenderNed details fetch error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
