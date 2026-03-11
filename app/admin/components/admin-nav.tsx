import Link from "next/link";

type AdminNavProps = {
  current: "orders" | "products";
};

function itemClasses(isActive: boolean): string {
  return [
    "rounded-full px-4 py-2 text-sm transition",
    isActive
      ? "bg-stone-900 text-stone-100"
      : "border border-stone-300 text-stone-800 hover:bg-stone-100",
  ].join(" ");
}

export function AdminNav({ current }: AdminNavProps) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Link href="/admin/orders" className={itemClasses(current === "orders")}>
        Orders
      </Link>
      <Link
        href="/admin/products"
        className={itemClasses(current === "products")}
      >
        Products
      </Link>
      <form action="/api/admin/logout" method="post" className="ml-auto">
        <button
          type="submit"
          className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-800 hover:bg-stone-100"
        >
          Logout
        </button>
      </form>
    </div>
  );
}
