import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

const sections = [
  {
    title: "Private Sessions",
    description:
      "Manage parents, players, and jump into private player work.",
    href: "/admin/private-sessions",
  },
  {
    title: "Group Sessions",
    description: "Group training area (starting as an empty page for now).",
    href: "/admin/group-training",
  },
  {
    title: "Videos",
    description: "Add, edit, publish, and remove YouTube training videos.",
    href: "/admin/videos",
  },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-emerald-50">
      <header className="bg-linear-to-r from-emerald-600 to-emerald-700">
        <div className="mx-auto max-w-6xl px-6 py-10">
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
                Welcome to the admin. View things here:
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-5 md:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <div className="text-lg font-semibold text-gray-900">{section.title}</div>
              <p className="mt-2 text-sm text-gray-600">{section.description}</p>
              <div className="mt-5 text-sm font-semibold text-emerald-700">
                Open {section.title} -&gt;
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
