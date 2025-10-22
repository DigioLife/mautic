import { Outlet } from 'react-router-dom';

export default function MasterAdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Outlet />
    </div>
  );
}
