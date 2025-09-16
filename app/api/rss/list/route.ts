import { NextResponse } from "next/server";
import Parser from "rss-parser";

export async function GET() {
  const parser = new Parser();

  // TenderNed RSS feed (laatste publicaties)
  const feed = await parser.parseURL(
    "http://www.tenderned.nl/tenderned-rss-web/rss/laatste-publicatie.rss"
  );

  // Extracteer publicatieId uit link
  const items = feed.items.map((item) => {
    const link = item.link || "";
    const match = link.match(/overzicht\/(\d+)/);
    return {
      publicatieId: match ? match[1] : null,
      title: item.title,
      link,
      pubDate: item.pubDate,
    };
  });

  return NextResponse.json({ count: items.length, items });
}
