import { requireAdminPage } from "@/server/admin/auth";

export default async function ProtectedAdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdminPage();
  return children;
}
