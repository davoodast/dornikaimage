import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth/jwt';
import LogsTable from '@/components/admin/LogsTable';
import SettingsForm from '@/components/admin/SettingsForm';
import LogoutButton from '@/components/admin/LogoutButton';

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) redirect('/admin/login');

  const payload = await verifyToken(token);
  if (!payload) redirect('/admin/login');

  return (
    <main className="min-h-screen bg-slate-950 text-white" dir="rtl">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-sm font-bold">
              D
            </div>
            <span className="text-lg font-semibold text-teal-400">پنل مدیریت DornikaImage</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm hidden sm:block">{payload.username}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <LogsTable />
        <SettingsForm />
      </div>
    </main>
  );
}
