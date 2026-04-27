import { AppShell } from "@/components/AppShell";
import { SettingsForm } from "./SettingsForm";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-text-dim">
          Tune your reading speed for time-to-finish estimates, and wire up Send-to-Kindle so books
          land on your e-reader in one click.
        </p>
      </header>
      <SettingsForm
        firstName={user.firstName}
        kindleEmail={user.kindleEmail}
        readingSpeedWpm={user.readingSpeedWpm}
      />
    </AppShell>
  );
}
