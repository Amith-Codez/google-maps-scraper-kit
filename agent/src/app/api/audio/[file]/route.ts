import fs from "node:fs";
import path from "node:path";
import { audioDir } from "@/lib/voice";

export const dynamic = "force-dynamic";

// Serves a generated voice note so it can be played on the lead card.
export async function GET(_req: Request, ctx: RouteContext<"/api/audio/[file]">) {
  const name = path.basename((await ctx.params).file);
  if (!/^lead-\d+-(en|hi|te)-\d+\.mp3$/.test(name)) return new Response("not found", { status: 404 });
  const file = path.join(audioDir(), name);
  if (!fs.existsSync(file)) return new Response("not found", { status: 404 });
  return new Response(fs.readFileSync(file), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
