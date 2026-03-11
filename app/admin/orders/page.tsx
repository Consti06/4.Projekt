import { AdminNav } from "@/app/admin/components/admin-nav";
import { requireAdminPage } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function AdminOrdersPage() {
  await requireAdminPage("/admin/orders");

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      payment: true,
      address: true,
    },
    take: 50,
  });

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 sm:px-10">
      <h1 className="text-3xl font-semibold text-stone-900">Admin Orders</h1>
      <p className="mt-2 text-sm text-stone-700">
        Latest paid and pending orders. Add auth before production launch.
      </p>

      <AdminNav current="orders" />

      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-400/60 p-6 text-stone-700">
          No orders yet.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-stone-900">
                  {order.orderNumber}
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-stone-900 px-3 py-1 text-stone-100">
                    {order.status}
                  </span>
                  <span className="rounded-full bg-stone-200 px-3 py-1 text-stone-800">
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                <p>Email: {order.customerEmail}</p>
                <p>Created: {order.createdAt.toLocaleString("de-AT")}</p>
                <p>
                  Total: {formatMoney(Number(order.totalAmount), order.currency)}
                </p>
                <p>
                  Payment ID: {order.payment?.providerPaymentId || "not linked"}
                </p>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-stone-900">Items</p>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.quantity} x {item.title} (
                      {formatMoney(Number(item.lineTotal), order.currency)})
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-stone-900">
                  Shipping Address
                </p>
                {order.address ? (
                  <p className="mt-1 text-sm text-stone-700">
                    {order.address.fullName}, {order.address.line1}
                    {order.address.line2 ? `, ${order.address.line2}` : ""},{" "}
                    {order.address.postalCode} {order.address.city},{" "}
                    {order.address.countryCode}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-stone-700">Not available</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
