import { AdminManager } from './components/AdminManager';
import { Shield } from 'lucide-react';

export default function ManageAdminsPage() {
  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          Manage Admins
        </h2>
      </div>
      <AdminManager />
    </>
  );
}
