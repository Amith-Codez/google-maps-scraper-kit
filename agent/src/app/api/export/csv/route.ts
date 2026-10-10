import { clientCsv } from "@/lib/report/clients";

export const dynamic = "force-dynamic";

// Your own leads, downloaded to your machine (contains contact details: keep it private, never commit it).
export async function GET(req: Request) {
  const c = Number(new URL(req.url).searchParams.get("c")) || undefined;
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + clientCsv(c), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pitchwala-clients-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
