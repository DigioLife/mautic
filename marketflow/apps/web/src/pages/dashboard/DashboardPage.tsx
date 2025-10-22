import { Users, Mail, TrendingUp, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    { name: 'Total Contacts', value: '2,543', icon: Users, change: '+12.5%', positive: true },
    { name: 'Email Campaigns', value: '45', icon: Mail, change: '+3', positive: true },
    { name: 'Open Rate', value: '24.8%', icon: TrendingUp, change: '+2.1%', positive: true },
    { name: 'Revenue', value: '$12,450', icon: DollarSign, change: '+18.2%', positive: true },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with your campaigns.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className={`text-sm mt-2 ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change} from last month
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition font-medium">
              Create Email Campaign
            </button>
            <button className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium">
              Import Contacts
            </button>
            <button className="w-full text-left px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition font-medium">
              Build Workflow
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-medium">Welcome Email sent</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-medium">125 new contacts added</p>
                <p className="text-xs text-gray-500">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-medium">Campaign "Summer Sale" completed</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-sm p-6 text-white">
        <h2 className="text-xl font-semibold mb-2">Getting Started with MarketFlow</h2>
        <p className="mb-4 opacity-90">Follow these steps to set up your marketing automation</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-lg font-bold mb-2">
              1
            </div>
            <h3 className="font-semibold mb-1">Import Contacts</h3>
            <p className="text-sm opacity-90">Upload your contact list or integrate with your CRM</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-lg font-bold mb-2">
              2
            </div>
            <h3 className="font-semibold mb-1">Create Campaign</h3>
            <p className="text-sm opacity-90">Design beautiful emails and set up your first campaign</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-lg font-bold mb-2">
              3
            </div>
            <h3 className="font-semibold mb-1">Automate</h3>
            <p className="text-sm opacity-90">Build workflows to automate your marketing tasks</p>
          </div>
        </div>
      </div>
    </div>
  );
}
