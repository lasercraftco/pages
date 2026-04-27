import { AppShell } from "@/components/AppShell";
import { FilterRail } from "@/components/library/FilterRail";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { SmartShelves } from "@/components/library/SmartShelves";
import { requireUser } from "@/lib/auth/session";
import { listBooks, smartShelves, type LibraryFilter } from "@/lib/library/queries";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LibraryPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter: LibraryFilter = {
    q: typeof sp.q === "string" ? sp.q : undefined,
    kind: (typeof sp.kind === "string" ? sp.kind : undefined) as LibraryFilter["kind"],
    status: (typeof sp.status === "string" ? sp.status : undefined) as LibraryFilter["status"],
    sort: (typeof sp.sort === "string" ? sp.sort : "added") as LibraryFilter["sort"],
    tag: typeof sp.tag === "string" ? sp.tag : undefined,
  };

  const [books, shelves] = await Promise.all([listBooks(user.id, filter), smartShelves(user.id)]);
  const isFiltered = !!(filter.q || filter.kind || filter.status || filter.tag);

  return (
    <AppShell user={user}>
      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <FilterRail />
        <div>
          {!isFiltered ? <SmartShelves shelves={shelves} /> : null}
          <header className="mt-2 flex items-end justify-between">
            <h1 className="text-2xl font-bold">
              {isFiltered ? "Results" : "All books & audiobooks"}
              <span className="ml-2 text-sm text-text-faint">{books.length}</span>
            </h1>
          </header>
          <LibraryGrid books={books} />
        </div>
      </div>
    </AppShell>
  );
}
