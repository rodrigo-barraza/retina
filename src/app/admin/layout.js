import AdminShell from "../../components/AdminShell";

export const metadata = {
  title: "Iris — Prism Admin Dashboard",
  description:
    "Analytics, activity monitoring, and administration for Prism AI Gateway",
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
