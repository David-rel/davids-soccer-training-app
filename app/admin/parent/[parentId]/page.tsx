import AdminParentClient from "@/app/admin/parent/[parentId]/ui/AdminParentClient";

export const dynamic = "force-dynamic";

export default function AdminParentPage(props: {
  params: Promise<{ parentId: string }>;
}) {
  return <AdminParentClient params={props.params} />;
}
