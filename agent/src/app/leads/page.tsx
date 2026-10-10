import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { LeadsView } from "@/components/LeadsView";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const sp = await searchParams;
  let id = Number(Array.isArray(sp.c) ? sp.c[0] : sp.c);
  if (!id) {
    const latest = getDb().select({ id: schema.campaigns.id }).from(schema.campaigns).orderBy(desc(schema.campaigns.id)).limit(1).get();
    id = latest?.id ?? 0;
  }
  if (!id)
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">No leads yet</h1>
        <p className="mt-2 text-ink-2">Type your two sentences on the Start screen and Pitchwala will find real businesses.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-chilli px-5 py-2.5 font-medium text-white">
          Start a campaign
        </Link>
      </div>
    );
  return <LeadsView campaignId={id} />;
}
