import { LeadCard } from "@/components/LeadCard";

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  return <LeadCard leadId={Number(id)} />;
}
