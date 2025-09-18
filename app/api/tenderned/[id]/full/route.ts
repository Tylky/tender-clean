import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://www.tenderned.nl/papi/tenderned-rs-tns/v2";

async function fetchWithAuth(url: string, accept: string = "application/json") {
  const username = process.env.TENDERNED_USER;
  const password = process.env.TENDERNED_PASS;

  if (!username || !password) {
    throw new Error("Missing TenderNed credentials");
  }

  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: accept,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`TenderNed API error ${url}: ${res.status} ${res.statusText}`);
  }

  return res.text();
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  try {
    // 1. Basisdetails ophalen
    const publicationRes = await fetchWithAuth(`${BASE_URL}/publicaties/${id}`);
    const publication = JSON.parse(publicationRes);

    // 2. Documenten ophalen
    let documents: any[] = [];
    try {
      const docsRes = await fetchWithAuth(`${BASE_URL}/publicaties/${id}/documenten`);
      const docsJson = JSON.parse(docsRes);
      documents = docsJson.documenten ?? [];
    } catch {
      documents = [];
    }

    // 3. Vraag & Antwoord ophalen
    let qa: any[] = [];
    try {
      const qaRes = await fetchWithAuth(`${BASE_URL}/publicaties/${id}/vragen`);
      const qaJson = JSON.parse(qaRes);
      qa = qaJson ?? [];
    } catch {
      qa = [];
    }

    // 4. XML ophalen voor winnaars + gunningscriteria
    let winners: any[] = [];
    let awardCriteria: any[] = [];
    try {
      const xmlRes = await fetchWithAuth(
        `${BASE_URL}/publicaties/${id}/public-xml`,
        "application/xml"
      );

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      });

      const xml = parser.parse(xmlRes);

      const organizations =
        xml?.ContractAwardNotice?.["ext:UBLExtensions"]?.["ext:UBLExtension"]
          ?.["ext:ExtensionContent"]?.["efext:EformsExtension"]?.["efac:Organizations"]
          ?.["efac:Organization"] || [];

      winners = organizations
        .map((org: any) => org?.["efac:Company"])
        .filter(Boolean)
        .map((c: any) => ({
          name: c?.["cac:PartyName"]?.["cbc:Name"]?.["#text"] || null,
          website: c?.["cbc:WebsiteURI"] || null,
          email: c?.["cac:Contact"]?.["cbc:ElectronicMail"] || null,
          phone: c?.["cac:Contact"]?.["cbc:Telephone"] || null,
          address: c?.["cac:PostalAddress"]
            ? `${c?.["cac:PostalAddress"]?.["cbc:StreetName"] || ""}, ${
                c?.["cac:PostalAddress"]?.["cbc:CityName"] || ""
              } ${c?.["cac:PostalAddress"]?.["cbc:PostalZone"] || ""}`
            : null,
        }))
        .filter((w: any) => w.name);

      const criteria =
        xml?.ContractAwardNotice?.["cac:ProcurementProjectLot"]?.["cac:TenderingTerms"]
          ?.["cac:AwardingTerms"]?.["cac:AwardingCriterion"]?.[
          "cac:SubordinateAwardingCriterion"
        ] || [];

      awardCriteria = Array.isArray(criteria)
        ? criteria.map((c: any) => ({
            type: c?.["cbc:AwardingCriterionTypeCode"]?.["#text"] || null,
            name: c?.["cbc:Name"]?.["#text"] || null,
            description: c?.["cbc:Description"]?.["#text"] || null,
            weight:
              c?.["ext:UBLExtensions"]?.["ext:UBLExtension"]?.["ext:ExtensionContent"]
                ?.["efext:EformsExtension"]?.["efac:AwardCriterionParameter"]
                ?.["efbc:ParameterNumeric"] || null,
          }))
        : [];
    } catch {
      winners = [];
      awardCriteria = [];
    }

    // 5. Alles samenvoegen
    return NextResponse.json({
      id,
      publication,
      documents,
      qa,
      winners,
      awardCriteria,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
