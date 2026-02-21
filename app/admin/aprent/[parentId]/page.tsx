import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MisspelledParentPage(props: {
  params: Promise<{ parentId: string }>;
}) {
  const { parentId } = await props.params;
  redirect(`/admin/parent/${parentId}`);
}
