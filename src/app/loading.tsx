function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="h-48 animate-pulse bg-slate-200" />
      <div className="space-y-3 p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <section className="mb-10 rounded-[28px] bg-white p-8 shadow-sm">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-10 w-full max-w-xl animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded bg-slate-200" />
      </section>

      <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>
    </main>
  );
}
