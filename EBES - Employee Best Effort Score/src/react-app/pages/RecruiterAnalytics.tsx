import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Target, Award, BarChart3, Users, Filter, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface Client {
  id: number;
  name: string;
}

interface Role {
  id: number;
  title: string;
  role_code: string;
}

interface AnalyticsData {
  total_submissions: number;
  total_interviews: number;
  interview_1: number;
  interview_2: number;
  interview_3: number;
  total_deals: number;
  total_dropouts: number;
  active_roles_count: number;
  client_breakdown: Array<{ client_name: string; count: number }>;
  team_breakdown: Array<{ team_name: string; count: number }>;
  daily_trend: Array<{ date: string; count: number }>;
  monthly_trend: Array<{ month: string; count: number }>;
}

interface EBESData {
  score: number;
  performance_label: string;
}

export default function RecruiterAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [ebesData, setEbesData] = useState<EBESData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [clients, setClients] = useState<Client[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedEntryType, setSelectedEntryType] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // EBES filter
  const [ebesDateFilter, setEbesDateFilter] = useState<string>('current_month');
  const [ebesCustomStart, setEbesCustomStart] = useState<string>('');
  const [ebesCustomEnd, setEbesCustomEnd] = useState<string>('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAnalytics();
      fetchEBESScore();
    }
  }, [selectedClient, selectedRole, selectedEntryType, dateRange, customStartDate, customEndDate, ebesDateFilter, ebesCustomStart, ebesCustomEnd]);

  const fetchInitialData = async () => {
    try {
      // Fetch clients
      const clientsResponse = await fetch('/api/recruiter/clients');
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setClients(clientsData);
      }

      // Fetch all roles for this recruiter
      const rolesResponse = await fetch('/api/recruiter/all-roles');
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRoles(rolesData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedClient) params.append('client_id', selectedClient);
      if (selectedRole) params.append('role_id', selectedRole);
      if (selectedEntryType) params.append('entry_type', selectedEntryType);
      if (dateRange) params.append('date_range', dateRange);
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.append('start_date', customStartDate);
        params.append('end_date', customEndDate);
      }

      const response = await fetch(`/api/recruiter/analytics?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchEBESScore = async () => {
    try {
      const params = new URLSearchParams();
      params.append('filter', ebesDateFilter);
      if (ebesDateFilter === 'custom' && ebesCustomStart && ebesCustomEnd) {
        params.append('start_date', ebesCustomStart);
        params.append('end_date', ebesCustomEnd);
      }

      const response = await fetch(`/api/recruiter/ebes-score?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEbesData(data);
      }
    } catch (error) {
      console.error('Failed to fetch EBES score:', error);
    }
  };

  const clearFilters = () => {
    setSelectedClient('');
    setSelectedRole('');
    setSelectedEntryType('');
    setDateRange('this_month');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const getPerformanceColor = (label: string) => {
    switch (label) {
      case 'Excellent': return 'from-emerald-500 to-green-500';
      case 'Strong': return 'from-blue-500 to-indigo-500';
      case 'Average': return 'from-yellow-500 to-orange-500';
      case 'At Risk': return 'from-red-500 to-pink-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* EBES Score Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">EBES Score</h2>
            <p className="text-indigo-100">Employee Best Effort Score</p>
          </div>
          <div className="flex gap-2">
            {[
              { value: 'current_month', label: 'Current Month' },
              { value: 'last_month', label: 'Last Month' },
              { value: 'custom', label: 'Custom' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setEbesDateFilter(filter.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  ebesDateFilter === filter.value
                    ? 'bg-white text-indigo-600 shadow-md'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {ebesDateFilter === 'custom' && (
          <div className="flex gap-3 mb-6">
            <input
              type="date"
              value={ebesCustomStart}
              onChange={(e) => setEbesCustomStart(e.target.value)}
              className="px-4 py-2 rounded-lg text-gray-800"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={ebesCustomEnd}
              onChange={(e) => setEbesCustomEnd(e.target.value)}
              className="px-4 py-2 rounded-lg text-gray-800"
              placeholder="End Date"
            />
          </div>
        )}

        <div className="flex items-center gap-8">
          <div className="flex-1">
            <div className="text-6xl font-bold mb-2">
              {ebesData?.score?.toFixed(1) || '0.0'}
            </div>
            <div className={`inline-block px-4 py-2 rounded-lg bg-gradient-to-r ${getPerformanceColor(ebesData?.performance_label || 'Average')} text-white font-semibold`}>
              {ebesData?.performance_label || 'No Data'}
            </div>
          </div>
          <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Target className="w-16 h-16 text-white" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-bold text-gray-800">Analytics Filters</span>
          </div>
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.title} ({role.role_code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entry Type</label>
            <select
              value={selectedEntryType}
              onChange={(e) => setSelectedEntryType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="submission">Submission</option>
              <option value="interview">Interview</option>
              <option value="deal">Deal</option>
              <option value="dropout">Drop Out</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Submissions</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {analytics?.total_submissions || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Interviews</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {analytics?.total_interviews || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <span className="text-slate-500">1st: {analytics?.interview_1 || 0}</span>
            <span className="text-slate-500">2nd: {analytics?.interview_2 || 0}</span>
            <span className="text-slate-500">3rd: {analytics?.interview_3 || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Deals</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {analytics?.total_deals || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Drop Outs</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {analytics?.total_dropouts || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
              <X className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Roles Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          <h3 className="text-xl font-bold text-slate-800">Active Roles Working On</h3>
        </div>
        <div className="text-4xl font-bold text-indigo-600">
          {analytics?.active_roles_count || 0}
        </div>
        <p className="text-slate-500 mt-2">Roles currently being worked on</p>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client-wise Breakdown */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Client-wise Submission Count</h3>
          {analytics?.client_breakdown && analytics.client_breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.client_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="client_name" stroke="#64748b" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">No data available</div>
          )}
        </div>

        {/* Team-wise Breakdown */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Team-wise Submission Count</h3>
          {analytics?.team_breakdown && analytics.team_breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.team_breakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ client_name, count }) => `${client_name}: ${count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="team_name"
                >
                  {analytics.team_breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">No data available</div>
          )}
        </div>
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Daily Submission Trend</h3>
          {analytics?.daily_trend && analytics.daily_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.daily_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Submissions" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">No data available</div>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Monthly Submission Trend</h3>
          {analytics?.monthly_trend && analytics.monthly_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" name="Submissions" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
