import { SettingsForm } from "@/components/SettingsForm";
import { HealthStrip } from "@/components/HealthStrip";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-ink-2">Changes apply live: the worker reads them on its next step.</p>
      <div className="mt-5">
        <HealthStrip />
      </div>
      <div className="mt-6">
        <SettingsForm />
      </div>
    </div>
  );
}
