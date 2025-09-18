import React, { useState, useEffect } from 'react';
import { useEcwid } from '../hooks/useEcwid';
import { 
  ChartBarIcon,
  EyeIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const Analytics = () => {
  const { isLoaded, storeId, trackEvent } = useEcwid();
  const [analytics, setAnalytics] = useState({});
  const [realtimeData, setRealtimeData] = useState({});
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch analytics summary
        const summaryResponse = await fetch(`/api/analytics/summary?storeId=${storeId}`);
        const summaryData = await summaryResponse.json();
        
        if (summaryData.success) {
          setAnalytics(summaryData.data);
        }

        // Fetch real-time data
        const realtimeResponse = await fetch(`/api/analytics/realtime?storeId=${storeId}`);
        const realtimeData = await realtimeResponse.json();
        
        if (realtimeData.success) {
          setRealtimeData(realtimeData.data);
        }

        trackEvent('analytics_viewed', { storeId, dateRange });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && storeId) {
      fetchAnalytics();
    }
  }, [isLoaded, storeId, dateRange, trackEvent]);

  const getDateRangeLabel = (range) => {
    const ranges = {
      '1d': 'Last 24 hours',
      '7d': 'Last 7 days',
      '30d': 'Last 30 days',
      '90d': 'Last 90 days'
    };
    return ranges[range] || range;
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your store performance and customer behavior
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="form-input"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Events
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {analytics.totalEvents || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EyeIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Page Views
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {analytics.eventTypes?.['page_viewed'] || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCartIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Cart Events
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {analytics.eventTypes?.['cart_updated'] || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    User Sessions
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {analytics.eventTypes?.['session_started'] || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Events */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Top Events</h3>
          </div>
          <div className="card-body">
            {analytics.topEvents && analytics.topEvents.length > 0 ? (
              <div className="space-y-4">
                {analytics.topEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {index + 1}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {event.count}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No events data</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Events will appear here as customers interact with your store.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Real-time Activity</h3>
            <p className="text-sm text-gray-500">Last hour</p>
          </div>
          <div className="card-body">
            {realtimeData.hourlyBreakdown && realtimeData.hourlyBreakdown.length > 0 ? (
              <div className="space-y-4">
                {realtimeData.hourlyBreakdown.map((event, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.first_event).toLocaleTimeString()} - {new Date(event.last_event).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {event.count}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Activity will appear here as it happens.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Events */}
      {realtimeData.recentEvents && realtimeData.recentEvents.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Events</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {realtimeData.recentEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {event.event_data ? Object.keys(JSON.parse(event.event_data)).length : 0} properties
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Event Types Breakdown */}
      {analytics.eventTypes && Object.keys(analytics.eventTypes).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Event Types Breakdown</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(analytics.eventTypes).map(([eventType, count]) => (
                <div key={eventType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">
                    {eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className="text-sm font-bold text-primary-600">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
