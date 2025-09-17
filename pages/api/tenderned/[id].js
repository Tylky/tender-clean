// pages/api/tenderned/[id].js

export default async function handler(req, res) {
  try {
    const { id } = req.query; // publicatieId uit de URL
    const username = process.env.TENDERNED_USER;
    const password = process.env.TENDERNED_PASS;
    const baseUrl = process.env.TENDERNED_URL;

    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const url = `${baseUrl}/publicaties/${id}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json", // kan ook application/xml
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

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("TenderNed detail fetch error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
