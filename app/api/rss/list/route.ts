import { NextResponse } from "next/server";
import Parser from "rss-parser";

export const dynamic = "force-dynamic"; // 🚀 voorkom prerendering

export async function GET() {
  const parser = new Parser();

  const feed = await parser.parseURL(
    "http://www.tenderned.nl/tenderned-rss-web/rss/laatste-publicatie.rss"
  );

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
