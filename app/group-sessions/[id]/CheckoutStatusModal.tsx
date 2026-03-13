"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CheckoutStatus = "success" | "cancelled" | null;

export default function CheckoutStatusModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");

  const [initialStatus] = useState<CheckoutStatus>(() => {
    if (checkout === "success" || checkout === "cancelled") return checkout;
    return null;
  });
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!initialStatus) return;

    const next = new URLSearchParams(searchParams.toString());
    next.delete("checkout");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [initialStatus, pathname, router, searchParams]);

  if (!initialStatus || isDismissed) return null;

  if (initialStatus === "cancelled") {
    return (
      <div className="mb-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
        Checkout canceled. You can complete signup any time below.
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-emerald-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You</h2>
        <p className="text-gray-700 leading-relaxed mb-5">
          Your payment was successful and your player is signed up. A verification email will be
          sent shortly.
        </p>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-5 py-2.5 font-semibold hover:bg-emerald-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
