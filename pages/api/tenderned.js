export default async function handler(req, res) {
  const response = await fetch(process.env.TENDERNED_URL, {
    headers: {
      Authorization: process.env.TENDERNED_AUTH,
      Accept: "application/xml",
    },
    cache: "no-store",
    redirect: "follow",
  });

  const data = await response.text(); // of response.json() afhankelijk van wat TenderNed terugstuurt
  res.status(200).send(data);
}
