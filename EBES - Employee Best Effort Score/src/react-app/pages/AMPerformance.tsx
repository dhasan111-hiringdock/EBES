import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Award, Target, Briefcase, Users, CheckCircle, XCircle, Clock, AlertCircle, BarChart3 } from "lucide-react";
import { fetchWithAuth } from "@/react-app/utils/api";

interface PerformanceData {
  total_roles: number;
  active_roles: number;
  non_active_roles: number;
  total_interviews: number;
  interview_1_count: number;
  interview_2_count: number;
  interview_3_count: number;
  total_deals: number;
  total_lost: number;
  total_on_hold: number;
  total_no_answer: number;
  total_cancelled: number;
  ebes_score: number;
  performance_label: string;
  current_month: {
    roles: number;
    interviews: number;
    deals: number;
    lost: number;
  };
  last_month: {
    roles: number;
    interviews: number;
    deals: number;
    lost: number;
  };
  roles_to_interviews_conversion: number;
  interviews_to_deals_conversion: number;
}

interface ClientPerformance {
  client_id: number;
  client_name: string;
  client_code: string;
  total_roles: number;
  active_roles: number;
  interview_1: number;
  interview_2: number;
  interview_3: number;
  deals: number;
  lost: number;
  on_hold: number;
  no_answer: number;
  health: string;
}

interface TeamPerformance {
  team_id: number;
  team_name: string;
  team_code: string;
  total_roles: number;
  active_roles: number;
  total_interviews: number;
  total_deals: number;
  total_lost: number;
  performance_label: string;
}

interface Client {
  id: number;
  name: string;
  client_code: string;
}

interface Team {
  id: number;
  name: string;
  team_code: string;
}

export default function AMPerformance() {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [clientPerformance, setClientPerformance] = useState<ClientPerformance[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (clients.length > 0 || teams.length > 0) {
      fetchPerformanceData();
    }
  }, [selectedClient, selectedTeam, selectedStatus, dateRange, customStartDate, customEndDate]);

  const fetchAssignments = async () => {
    try {
      const response = await fetchWithAuth("/api/am/assignments");
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    }
  };

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClient) params.append("client_id", selectedClient.toString());
      if (selectedTeam) params.append("team_id", selectedTeam.toString());
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      
      // Date range handling
      if (dateRange === "custom" && customStartDate && customEndDate) {
        params.append("start_date", customStartDate);
        params.append("end_date", customEndDate);
      } else if (dateRange !== "all_time") {
        params.append("date_range", dateRange);
      }

      const response = await fetchWithAuth(`/api/am/performance?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPerformance(data.overview);
        setClientPerformance(data.client_performance || []);
        setTeamPerformance(data.team_performance || []);
      }
    } catch (error) {
      console.error("Failed to fetch performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "Strong":
        return "bg-green-100 text-green-800 border-green-200";
      case "Average":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "At Risk":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getTrendPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
  };

  if (loading && !performance) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Performance Dashboard</h2>
        <p className="text-gray-600 mt-1">Track your role management and deal closures</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Client Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
            <select
              value={selectedClient || ""}
              onChange={(e) => setSelectedClient(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.client_code})
                </option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
            <select
              value={selectedTeam || ""}
              onChange={(e) => setSelectedTeam(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.team_code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="deal">Deal</option>
              <option value="lost">Lost</option>
              <option value="on_hold">On Hold</option>
              <option value="no_answer">No Answer</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Range</option>
              <option value="all_time">All Time</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRange === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {performance && (
        <>
          {/* EBES Score */}
          <div className={`bg-gradient-to-br rounded-xl p-8 text-white shadow-2xl ${
            performance.performance_label === "Excellent"
              ? "from-green-500 to-green-600"
              : performance.performance_label === "Strong"
              ? "from-blue-500 to-blue-600"
              : performance.performance_label === "Average"
              ? "from-yellow-500 to-yellow-600"
              : "from-red-500 to-red-600"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-8 h-8" />
                  <h3 className="text-2xl font-bold">EBES Score</h3>
                </div>
                <p className="text-5xl font-bold mt-4">{performance.ebes_score.toFixed(1)}</p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm font-semibold backdrop-blur-sm">
                    {performance.performance_label}
                  </span>
                </div>
              </div>
              <div className="text-right opacity-90">
                <p className="text-sm mb-2">Performance Rating</p>
                <div className="text-4xl">
                  {performance.performance_label === "Excellent" && "🌟"}
                  {performance.performance_label === "Strong" && "💪"}
                  {performance.performance_label === "Average" && "📊"}
                  {performance.performance_label === "At Risk" && "⚠️"}
                </div>
              </div>
            </div>
          </div>

          {/* Core Performance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <p className="text-sm font-medium text-gray-600">Total Roles</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{performance.total_roles}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-gray-600">Active Roles</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">{performance.active_roles}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <p className="text-sm font-medium text-gray-600">Non-Active</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{performance.non_active_roles}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-teal-600" />
                <p className="text-sm font-medium text-gray-600">Interviews</p>
              </div>
              <p className="text-3xl font-bold text-teal-600">{performance.total_interviews}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-gray-600">Deals</p>
              </div>
              <p className="text-3xl font-bold text-green-600">{performance.total_deals}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm font-medium text-gray-600">Lost</p>
              </div>
              <p className="text-3xl font-bold text-red-600">{performance.total_lost}</p>
            </div>
          </div>

          {/* Interview Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-2">Interview 1</p>
                <p className="text-4xl font-bold text-teal-700">{performance.interview_1_count}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-2">Interview 2</p>
                <p className="text-4xl font-bold text-blue-700">{performance.interview_2_count}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-2">Interview 3</p>
                <p className="text-4xl font-bold text-indigo-700">{performance.interview_3_count}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-2">Deals Closed</p>
                <p className="text-4xl font-bold text-green-700">{performance.total_deals}</p>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <p className="text-sm font-medium text-gray-600">On Hold</p>
              </div>
              <p className="text-3xl font-bold text-yellow-600">{performance.total_on_hold}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <p className="text-sm font-medium text-gray-600">No Answer</p>
              </div>
              <p className="text-3xl font-bold text-orange-600">{performance.total_no_answer}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-gray-600" />
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
              </div>
              <p className="text-3xl font-bold text-gray-600">{performance.total_cancelled}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-purple-600" />
                <p className="text-sm font-medium text-gray-600">Conversion</p>
              </div>
              <p className="text-3xl font-bold text-purple-600">{performance.interviews_to_deals_conversion.toFixed(1)}%</p>
            </div>
          </div>

          {/* Trends & Comparison */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month vs Last Month</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">Roles Created</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{performance.current_month.roles}</p>
                    <p className="text-xs text-gray-500">This month</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(performance.current_month.roles, performance.last_month.roles)}
                      <span className={`text-sm font-semibold ${
                        performance.current_month.roles > performance.last_month.roles
                          ? "text-green-600"
                          : performance.current_month.roles < performance.last_month.roles
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}>
                        {getTrendPercentage(performance.current_month.roles, performance.last_month.roles)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">vs {performance.last_month.roles} last month</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">Interviews</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{performance.current_month.interviews}</p>
                    <p className="text-xs text-gray-500">This month</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(performance.current_month.interviews, performance.last_month.interviews)}
                      <span className={`text-sm font-semibold ${
                        performance.current_month.interviews > performance.last_month.interviews
                          ? "text-green-600"
                          : performance.current_month.interviews < performance.last_month.interviews
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}>
                        {getTrendPercentage(performance.current_month.interviews, performance.last_month.interviews)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">vs {performance.last_month.interviews} last month</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">Deals</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{performance.current_month.deals}</p>
                    <p className="text-xs text-gray-500">This month</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(performance.current_month.deals, performance.last_month.deals)}
                      <span className={`text-sm font-semibold ${
                        performance.current_month.deals > performance.last_month.deals
                          ? "text-green-600"
                          : performance.current_month.deals < performance.last_month.deals
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}>
                        {getTrendPercentage(performance.current_month.deals, performance.last_month.deals)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">vs {performance.last_month.deals} last month</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">Lost Roles</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{performance.current_month.lost}</p>
                    <p className="text-xs text-gray-500">This month</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(performance.last_month.lost, performance.current_month.lost)}
                      <span className={`text-sm font-semibold ${
                        performance.current_month.lost < performance.last_month.lost
                          ? "text-green-600"
                          : performance.current_month.lost > performance.last_month.lost
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}>
                        {getTrendPercentage(performance.current_month.lost, performance.last_month.lost)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">vs {performance.last_month.lost} last month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion View */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Roles → Interviews</p>
                <p className="text-4xl font-bold text-blue-700 mb-2">{performance.roles_to_interviews_conversion.toFixed(1)}%</p>
                <p className="text-xs text-gray-600">
                  {performance.total_interviews} interviews from {performance.total_roles} roles
                </p>
              </div>
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Interviews → Deals</p>
                <p className="text-4xl font-bold text-green-700 mb-2">{performance.interviews_to_deals_conversion.toFixed(1)}%</p>
                <p className="text-xs text-gray-600">
                  {performance.total_deals} deals from {performance.total_interviews} interviews
                </p>
              </div>
            </div>
          </div>

          {/* Client-Wise Performance */}
          {clientPerformance.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Client-Wise Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Total Roles</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Active</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Interview 1</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Interview 2</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Interview 3</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Deals</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Lost</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">On Hold</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">No Answer</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientPerformance.map((client) => (
                      <tr key={client.client_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{client.client_name}</p>
                            <p className="text-xs text-gray-500">{client.client_code}</p>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4 font-semibold text-gray-900">{client.total_roles}</td>
                        <td className="text-center py-3 px-4 font-semibold text-blue-600">{client.active_roles}</td>
                        <td className="text-center py-3 px-4 text-gray-700">{client.interview_1}</td>
                        <td className="text-center py-3 px-4 text-gray-700">{client.interview_2}</td>
                        <td className="text-center py-3 px-4 text-gray-700">{client.interview_3}</td>
                        <td className="text-center py-3 px-4 font-semibold text-green-600">{client.deals}</td>
                        <td className="text-center py-3 px-4 font-semibold text-red-600">{client.lost}</td>
                        <td className="text-center py-3 px-4 text-yellow-600">{client.on_hold}</td>
                        <td className="text-center py-3 px-4 text-orange-600">{client.no_answer}</td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getHealthColor(client.health)}`}>
                            {client.health}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Team-Wise Performance */}
          {teamPerformance.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team-Wise Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamPerformance.map((team) => (
                  <div
                    key={team.team_id}
                    className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200"
                  >
                    <div className="mb-4">
                      <p className="font-semibold text-gray-900">{team.team_name}</p>
                      <p className="text-xs text-gray-500">{team.team_code}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Roles:</span>
                        <span className="font-semibold text-gray-900">{team.total_roles}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active:</span>
                        <span className="font-semibold text-blue-600">{team.active_roles}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Interviews:</span>
                        <span className="font-semibold text-teal-600">{team.total_interviews}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Deals:</span>
                        <span className="font-semibold text-green-600">{team.total_deals}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Lost:</span>
                        <span className="font-semibold text-red-600">{team.total_lost}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getHealthColor(team.performance_label)}`}>
                        {team.performance_label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
