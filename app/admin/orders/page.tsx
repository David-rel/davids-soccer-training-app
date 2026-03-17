import Link from "next/link";
import Image from "next/image";
import { listAdminOrders } from "@/lib/points/service";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders().catch(() => []);

  return (
    <div className="min-h-screen bg-emerald-50">
      <header className="bg-linear-to-r from-emerald-600 to-emerald-700">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Image
                src="/icon.png"
                alt="Admin"
                width={56}
                height={56}
                className="h-14 w-14 rounded-2xl bg-white p-2"
                priority
              />
              <div>
                <div className="text-sm font-semibold text-emerald-50">Admin</div>
                <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                  Shop Orders
                </h1>
                <p className="mt-2 text-sm text-emerald-100">
                  All purchases across players, including SMS notification status.
                </p>
              </div>
            </div>
            <Link
              href="/admin"
              className="rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Back to admin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
          <p className="mt-1 text-sm text-gray-600">
            Latest first. Notification failures do not block purchases.
          </p>

          {orders.length === 0 ? (
            <p className="mt-6 text-sm text-gray-600">No orders yet.</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="pb-3 pr-4">When</th>
                    <th className="pb-3 pr-4">Player</th>
                    <th className="pb-3 pr-4">Item</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Credits</th>
                    <th className="pb-3 pr-4">Notification</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-emerald-100">
                      <td className="py-3 pr-4 text-gray-700">
                        {new Date(order.purchasedAt).toLocaleString("en-US", {
                          timeZone: "America/Phoenix",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-gray-900">{order.playerName}</div>
                        <div className="text-xs text-gray-500">
                          {order.parentName || order.parentEmail || "Parent"}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{order.itemName}</td>
                      <td className="py-3 pr-4 uppercase text-gray-700">{order.itemType}</td>
                      <td className="py-3 pr-4 text-gray-700">{order.creditsSpent}</td>
                      <td className="py-3 pr-4">
                        {order.notificationStatus === "sent" ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            Sent
                          </span>
                        ) : order.notificationStatus === "failed" ? (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                            Failed
                          </span>
                        ) : (
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
                            None
                          </span>
                        )}
                        {order.notificationError ? (
                          <p className="mt-1 text-xs text-red-600">{order.notificationError}</p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
