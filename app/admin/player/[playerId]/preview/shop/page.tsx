import AdminPreviewShopClient from "./ui/AdminPreviewShopClient";

export const dynamic = "force-dynamic";

export default function AdminPreviewShopPage(props: {
  params: Promise<{ playerId: string }>;
}) {
  return <AdminPreviewShopClient params={props.params} />;
}
