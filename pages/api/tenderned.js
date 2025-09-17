// pages/api/tenderned.js
export default async function handler(req, res) {
  try {
    const username = process.env.TENDERNED_USER;
    const password = process.env.TENDERNED_PASS;
    const baseUrl = process.env.TENDERNED_URL || "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

    if (!username || !password) {
      return res.status(500).json({
        error: "Missing env vars: TENDERNED_USER or TENDERNED_PASS",
      });
    }

    // Basic Auth header maken
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const apiUrl = `${baseUrl}/publicaties?page=0&size=5`;

    console.log("Fetching TenderNed:", apiUrl);

    // Probeer JSON eerst
    let response = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "follow",
    });

    // Als JSON niet ok is, probeer XML
    if (!response.ok) {
      console.warn("JSON fetch failed:", response.status, response.statusText);

      response = await fetch(apiUrl, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/xml",
        },
        cache: "no-store",
        redirect: "follow",
      });
    }

    // Nog steeds geen succes?
    if (!response.ok) {
      return res.status(response.status).json({
        error: `TenderNed API error: ${response.statusText}`,
        status: response.status,
        urlTried: apiUrl,
      });
    }

    // Bepaal content-type
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(200).json(data);
    } else {
      const data = await response.text();
      res.setHeader("Content-Type", "application/xml");
      return res.status(200).send(data);
    }
  } catch (error) {
    console.error("TenderNed fetch error:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
