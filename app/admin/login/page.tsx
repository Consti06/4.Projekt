type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const error = first(resolved.error);
  const next = first(resolved.next) || "/admin/orders";

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Admin Login</h1>
        <p className="mt-2 text-sm text-stone-700">
          Sign in to access protected admin pages.
        </p>

        {error === "invalid" ? (
          <p className="mt-4 rounded-lg bg-red-50 p-2 text-sm text-red-700">
            Invalid password.
          </p>
        ) : null}
        {error === "config" ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
            Missing `ADMIN_DASHBOARD_PASSWORD` in `.env`.
          </p>
        ) : null}

        <form method="post" action="/api/admin/login" className="mt-5 space-y-3">
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm font-medium text-stone-800">
            Password
          </label>
          <input
            type="password"
            name="password"
            required
            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none ring-stone-300 focus:ring"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-700"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
