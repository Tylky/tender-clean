// pages/api/tenderned/winner/[name].js
import { XMLParser } from "fast-xml-parser";

export default async function handler(req, res) {
  try {
    const { name } = req.query; // bv. "Donker Groep B.V."
    const username = process.env.TENDERNED_USER;
    const password = process.env.TENDERNED_PASS;
    const baseUrl =
      process.env.TENDERNED_URL ||
      "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

    if (!username || !password || !baseUrl) {
      return res.status(500).json({
        error: "Missing env vars",
      });
    }

    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const parser = new XMLParser({ ignoreAttributes: false });

    // Stap 1: haal de laatste award-publicaties op
    const listUrl = `${baseUrl}/publicaties?type=Award&size=50&page=0`;
    const listResp = await fetch(listUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    if (!listResp.ok) {
      return res.status(listResp.status).json({
        error: `TenderNed API error: ${listResp.statusText}`,
      });
    }

    const listData = await listResp.json();
    const results = [];

    // Stap 2: loop door alle publicaties heen
    for (const pub of listData._embedded?.publicaties || []) {
      const xmlResp = await fetch(
        `${baseUrl}/publicaties/${pub.id}/public-xml`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "*/*",
          },
        }
      );

      if (xmlResp.ok) {
        const xml = await xmlResp.text();
        const json = parser.parse(xml);

        // Stap 3: check awardees
        const awardees =
          json?.ContractAwardNotice?.AwardedTenderers?.["cac:Tenderer"];

        let partyNames = [];
        if (Array.isArray(awardees)) {
          partyNames = awardees.map(
            (a) => a?.["cac:PartyName"]?.["cbc:Name"]?.["#text"]
          );
        } else if (awardees) {
          partyNames = [
            awardees?.["cac:PartyName"]?.["cbc:Name"]?.["#text"],
          ];
        }

        if (
          partyNames.some(
            (p) => p && p.toLowerCase().includes(name.toLowerCase())
          )
        ) {
          results.push({
            id: pub.id,
            title: pub.titel,
            date: pub.datumPublicatie,
            awardees: partyNames,
            raw: json,
          });
        }
      }
    }

    return res.status(200).json({
      search: name,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("Winner search error:", err);
    return res.status(500).json({ error: err.message });
  }
}
