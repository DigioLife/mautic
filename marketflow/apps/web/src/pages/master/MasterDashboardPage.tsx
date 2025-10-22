import { useAuthStore } from '../../stores/auth.store';

export default function MasterDashboardPage() {
  const { user } = useAuthStore();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Master Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome, {user?.name}! Manage all tenants and system settings here.</p>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">System Overview</h2>
        <p className="text-gray-600">Master admin features coming in Phase 2!</p>
      </div>
    </div>
  );
}
