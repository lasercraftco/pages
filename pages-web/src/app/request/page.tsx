import { AppShell } from "@/components/AppShell";
import { RequestSearch } from "@/components/request/RequestSearch";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function RequestPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <header>
        <h1 className="text-3xl font-bold">Request a book</h1>
        <p className="mt-1 text-text-dim">
          Find any title across Google Books + OpenLibrary. Your request fulfills automatically via
          Readarr — usually a few minutes.
        </p>
      </header>
      <RequestSearch
        viewer={{
          firstName: user.firstName,
          isOwner: user.role === "owner",
          dailyQuota: user.dailyRequestQuota,
        }}
      />
    </AppShell>
  );
}
