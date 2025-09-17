// pages/api/tenderned/[id]/documents.js
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
    const url = `${baseUrl}/publicaties/${id}/documenten`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json", // vaak JSON voor documenten
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
    console.error("TenderNed documents fetch error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
