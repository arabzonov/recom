import React, { useState, useEffect } from 'react';
import { useEcwid } from '../hooks/useEcwid';
import { 
  ShoppingBagIcon, 
  ClipboardDocumentListIcon, 
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { isLoaded, storeId, trackEvent } = useEcwid();
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0,
    customers: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch store statistics
        const statsResponse = await fetch(`/api/ecwid/store/${storeId}/stats`);
        const statsData = await statsResponse.json();
        
        if (statsData.success) {
          setStats(statsData.data);
        }

        // Fetch recent orders
        const ordersResponse = await fetch(`/api/orders/recent/list?storeId=${storeId}&limit=5`);
        const ordersData = await ordersResponse.json();
        
        if (ordersData.success) {
          setRecentOrders(ordersData.data);
        }

        // Fetch analytics summary
        const analyticsResponse = await fetch(`/api/analytics/summary?storeId=${storeId}`);
        const analyticsData = await analyticsResponse.json();
        
        if (analyticsData.success) {
          setAnalytics(analyticsData.data);
        }

        // Track dashboard view
        trackEvent('dashboard_viewed', { storeId });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && storeId) {
      fetchDashboardData();
    }
  }, [isLoaded, storeId, trackEvent]);

  const statCards = [
    {
      name: 'Total Products',
      value: stats.products,
      icon: ShoppingBagIcon,
      change: '+12%',
      changeType: 'increase',
      color: 'blue'
    },
    {
      name: 'Total Orders',
      value: stats.orders,
      icon: ClipboardDocumentListIcon,
      change: '+8%',
      changeType: 'increase',
      color: 'green'
    },
    {
      name: 'Revenue',
      value: `$${stats.revenue?.toLocaleString() || 0}`,
      icon: CurrencyDollarIcon,
      change: '+15%',
      changeType: 'increase',
      color: 'purple'
    },
    {
      name: 'Customers',
      value: stats.customers,
      icon: UserGroupIcon,
      change: '+5%',
      changeType: 'increase',
      color: 'orange'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome to your Ecwid plugin dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-8 w-8 text-${stat.color}-600`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.changeType === 'increase' ? (
                          <ArrowUpIcon className="h-4 w-4 flex-shrink-0 self-center" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 flex-shrink-0 self-center" />
                        )}
                        <span className="sr-only">
                          {stat.changeType === 'increase' ? 'Increased' : 'Decreased'} by
                        </span>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Analytics Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Analytics Overview</h3>
          </div>
          <div className="card-body">
            {analytics.totalEvents > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  Total Events: {analytics.totalEvents}
                </div>
                <div className="space-y-2">
                  {analytics.topEvents?.slice(0, 5).map((event, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{event.eventType}</span>
                      <span className="text-sm font-medium text-gray-900">{event.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start using your store to see analytics here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
          </div>
          <div className="card-body">
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            #{order.order_number}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {order.customer_name || order.customer_email}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${order.total?.toFixed(2)}
                      </p>
                      <span className={`badge ${
                        order.status === 'fulfilled' ? 'badge-success' :
                        order.status === 'pending' ? 'badge-warning' : 'badge-gray'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent orders</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Orders will appear here once customers start placing them.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="btn btn-outline">
              <ShoppingBagIcon className="h-5 w-5 mr-2" />
              View Products
            </button>
            <button className="btn btn-outline">
              <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
              View Orders
            </button>
            <button className="btn btn-outline">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              View Analytics
            </button>
            <button className="btn btn-outline">
              <UserGroupIcon className="h-5 w-5 mr-2" />
              View Customers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
