import { HealthStrip } from "@/components/HealthStrip";

export default function StartPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-16 pb-24">
      <h1 className="text-center text-5xl font-semibold tracking-tight sm:text-6xl">
        Two sentences in.
        <br />
        <span className="text-chilli">Clients out.</span>
      </h1>
      <p className="mt-5 max-w-xl text-center text-ink-2">
        Tell Pitchwala what you sell and who you sell to. It finds real local businesses, invents one idea each would
        actually want, tests the pitch on a simulated owner, and pings your phone when someone is interested.
      </p>
      <div className="mt-10 w-full">
        <HealthStrip />
      </div>
    </div>
  );
}
