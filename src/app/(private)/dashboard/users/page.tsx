import { UsersTable } from "@/components/dashboard/user/UsersTable"; 

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie os usuários e permissões do sistema
        </p>
      </div>
      
      <UsersTable />
    </div>
  );
}