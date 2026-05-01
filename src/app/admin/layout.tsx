import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
