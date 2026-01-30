import AdminPreviewClient from "./ui/AdminPreviewClient";

export const dynamic = "force-dynamic";

export default function AdminPreviewPage(props: {
  params: Promise<{ playerId: string }>;
}) {
  return <AdminPreviewClient params={props.params} />;
}
