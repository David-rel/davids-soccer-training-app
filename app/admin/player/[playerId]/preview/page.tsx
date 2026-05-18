import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPreviewPage(props: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await props.params;
  redirect(`/player/${playerId}`);
}
