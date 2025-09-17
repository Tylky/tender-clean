// pages/api/tenderned.js
export default async function handler(req, res) {
  try {
    const response = await fetch(process.env.TENDERNED_URL, {
      headers: {
        Authorization: process.env.TENDERNED_AUTH,
        Accept: "application/xml",
      },
      cache: "no-store",
      redirect: "follow", // 🚀 belangrijk
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `TenderNed API error: ${response.statusText}` });
    }

    const data = await response.text(); // TenderNed geeft XML terug
    res.setHeader("Content-Type", "application/xml");
    return res.status(200).send(data);
  } catch (error) {
    console.error("TenderNed fetch error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
