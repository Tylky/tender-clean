// pages/api/tenderned.js

export default async function handler(req, res) {
  try {
    const username = process.env.TENDERNED_USER;
    const password = process.env.TENDERNED_PASS;
    const baseUrl = process.env.TENDERNED_URL;

    if (!username || !password || !baseUrl) {
      return res.status(500).json({
        error:
          "Missing environment variables. Check TENDERNED_USER, TENDERNED_PASS and TENDERNED_URL.",
      });
    }

    // Basic Auth header maken
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    // Voorbeeld: lijst van publicaties ophalen
    const response = await fetch(`${baseUrl}/publicaties?page=0&size=20`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/xml",
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `TenderNed API error: ${response.statusText}` });
    }

    const xmlData = await response.text();

    // Antwoord als XML doorgeven
    res.setHeader("Content-Type", "application/xml");
    return res.status(200).send(xmlData);
  } catch (error) {
    console.error("TenderNed fetch error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
