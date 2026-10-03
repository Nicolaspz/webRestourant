import { UsersTable } from "@/components/dashboard/user/UsersTable"; 
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <DashboardPageHeader title="Gestão de utilizadores" description="Consulte e mantenha os utilizadores e respetivos acessos ao sistema." />
      
      <UsersTable />
    </div>
  );
}
