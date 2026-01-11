import AdminPlayerClient from "@/app/admin/player/[playerId]/ui/AdminPlayerClient";

export const dynamic = "force-dynamic";

export default function AdminPlayerPage(props: {
  params: Promise<{ playerId: string }>;
}) {
  return <AdminPlayerClient params={props.params} />;
}
