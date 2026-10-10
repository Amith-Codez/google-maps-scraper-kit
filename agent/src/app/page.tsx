import { HealthStrip } from "@/components/HealthStrip";
import { StartForm } from "@/components/StartForm";
import { Counters } from "@/components/Counters";

export default function StartPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 pt-12 pb-24">
      <h1 className="text-center text-5xl font-semibold tracking-tight sm:text-6xl">
        Two sentences in.
        <br />
        <span className="text-chilli">Clients out.</span>
      </h1>
      <p className="mt-4 max-w-xl text-center text-ink-2">
        Pitchwala finds real local businesses, invents one idea each would actually want, tests the pitch on a simulated
        owner, and pings your phone when someone is interested.
      </p>
      <div className="mt-8 w-full">
        <StartForm />
      </div>
      <div className="mt-6 w-full">
        <Counters />
      </div>
      <div className="mt-6 w-full">
        <HealthStrip />
      </div>
    </div>
  );
}
