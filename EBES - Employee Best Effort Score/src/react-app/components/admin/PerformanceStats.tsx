import { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  Target,
  Award,
  Filter,
  Calendar,
  Search,
  Building2,
  UserCircle,
  Trophy,
  Medal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { fetchWithAuth } from "@/react-app/utils/api";

interface UserStats {
  user_id: number;
  user_code: string;
  name: string;
  email: string;
  role: string;
  teams: { id: number; name: string; code: string }[];
  clients: { id: number; name: string; code: string }[];
  ebesScore: number;
  performanceLabel: string;
  // Recruiter specific
  totalSubmissions?: number;
  interviews1st?: number;
  interviews2nd?: number;
  interviews3rd?: number;
  totalInterviews?: number;
  deals?: number;
  dropouts?: number;
  activeRoles?: number;
  nonActiveRoles?: number;
  // Account Manager specific
  totalRoles?: number;
  dealsClosedRoles?: number;
  lostRoles?: number;
  onHoldRoles?: number;
  noAnswerRoles?: number;
  // Recruitment Manager specific
  managedTeams?: number;
  totalRecruiters?: number;
  totalDeals?: number;
}

interface Leaderboards {
  recruiters: Array<{
    name: string;
    team: string;
    ebesScore: number;
    performanceLabel: string;
  }>;
  accountManagers: Array<{
    name: string;
    team: string;
    ebesScore: number;
    performanceLabel: string;
  }>;
  recruitmentManagers: Array<{
    name: string;
    team: string;
    ebesScore: number;
    performanceLabel: string;
  }>;
}

interface Team {
  id: number;
  name: string;
  team_code: string;
}

interface Client {
  id: number;
  name: string;
  client_code: string;
}

export default function PerformanceStats() {
  const [stats, setStats] = useState<UserStats[]>([]);
  const [leaderboards, setLeaderboards] = useState<Leaderboards | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [roleFilter, searchTerm, teamFilter, clientFilter, dateRange, startDate, endDate]);

  const fetchInitialData = async () => {
    try {
      const [teamsRes, clientsRes, leaderboardsRes] = await Promise.all([
        fetchWithAuth("/api/admin/teams"),
        fetchWithAuth("/api/admin/clients"),
        fetchWithAuth("/api/admin/leaderboards"),
      ]);

      if (teamsRes.ok && clientsRes.ok && leaderboardsRes.ok) {
        setTeams(await teamsRes.json());
        setClients(await clientsRes.json());
        setLeaderboards(await leaderboardsRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (searchTerm) params.append("userName", searchTerm);
      if (teamFilter !== "all") params.append("teamId", teamFilter);
      if (clientFilter !== "all") params.append("clientId", clientFilter);

      if (dateRange === "custom" && startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      } else if (dateRange === "today") {
        const today = new Date().toISOString().split("T")[0];
        params.append("startDate", today);
        params.append("endDate", today);
      } else if (dateRange === "week") {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        params.append("startDate", weekAgo.toISOString().split("T")[0]);
        params.append("endDate", today.toISOString().split("T")[0]);
      } else if (dateRange === "month") {
        const today = new Date();
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        params.append("startDate", monthAgo.toISOString().split("T")[0]);
        params.append("endDate", today.toISOString().split("T")[0]);
      }

      const response = await fetchWithAuth(`/api/admin/performance-stats?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (label: string) => {
    switch (label) {
      case "Excellent":
        return "text-green-700 bg-green-100";
      case "Good":
        return "text-blue-700 bg-blue-100";
      case "Average":
        return "text-yellow-700 bg-yellow-100";
      case "Needs Improvement":
        return "text-orange-700 bg-orange-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "recruiter":
        return "Recruiter";
      case "account_manager":
        return "Account Manager";
      case "recruitment_manager":
        return "Recruitment Manager";
      case "admin":
        return "Admin";
      default:
        return role;
    }
  };

  const totalUsers = stats.length;
  const avgEbesScore =
    stats.length > 0 ? stats.reduce((sum, s) => sum + s.ebesScore, 0) / stats.length : 0;

  const totalSubmissions = stats.reduce((sum, s) => sum + (s.totalSubmissions || 0), 0);
  const totalDeals = stats.reduce(
    (sum, s) => sum + (s.deals || 0) + (s.dealsClosedRoles || 0) + (s.totalDeals || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Performance Statistics</h2>
        <p className="text-gray-600 mt-1">Comprehensive performance metrics for all users</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{avgEbesScore.toFixed(1)}</span>
          </div>
          <p className="text-indigo-100 text-sm font-medium">Avg EBES Score</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{totalUsers}</span>
          </div>
          <p className="text-blue-100 text-sm font-medium">Total Users</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{totalSubmissions}</span>
          </div>
          <p className="text-purple-100 text-sm font-medium">Total Submissions</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{totalDeals}</span>
          </div>
          <p className="text-green-100 text-sm font-medium">Total Deals</p>
        </div>
      </div>

      {/* Leaderboards */}
      {leaderboards && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recruiter Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-gray-900">Top Recruiters</h3>
            </div>
            <div className="space-y-2">
              {leaderboards.recruiters.slice(0, 5).map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {index === 0 && <span className="text-xl">🥇</span>}
                    {index === 1 && <span className="text-xl">🥈</span>}
                    {index === 2 && <span className="text-xl">🥉</span>}
                    {index > 2 && (
                      <span className="text-gray-500 font-medium w-6">#{index + 1}</span>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600 text-sm">{user.ebesScore}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getPerformanceColor(
                        user.performanceLabel
                      )}`}
                    >
                      {user.performanceLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Manager Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Medal className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Top Account Managers</h3>
            </div>
            <div className="space-y-2">
              {leaderboards.accountManagers.slice(0, 5).map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {index === 0 && <span className="text-xl">🥇</span>}
                    {index === 1 && <span className="text-xl">🥈</span>}
                    {index === 2 && <span className="text-xl">🥉</span>}
                    {index > 2 && (
                      <span className="text-gray-500 font-medium w-6">#{index + 1}</span>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600 text-sm">{user.ebesScore}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getPerformanceColor(
                        user.performanceLabel
                      )}`}
                    >
                      {user.performanceLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recruitment Manager Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-900">Top Recruitment Managers</h3>
            </div>
            <div className="space-y-2">
              {leaderboards.recruitmentManagers.slice(0, 5).map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {index === 0 && <span className="text-xl">🥇</span>}
                    {index === 1 && <span className="text-xl">🥈</span>}
                    {index === 2 && <span className="text-xl">🥉</span>}
                    {index > 2 && (
                      <span className="text-gray-500 font-medium w-6">#{index + 1}</span>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600 text-sm">{user.ebesScore}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getPerformanceColor(
                        user.performanceLabel
                      )}`}
                    >
                      {user.performanceLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="recruiter">Recruiter</option>
              <option value="account_manager">Account Manager</option>
              <option value="recruitment_manager">Recruitment Manager</option>
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.team_code})
                </option>
              ))}
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.client_code})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search User</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, email, or code..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">User Performance Details</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Team</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Client(s)</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    EBES Score
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Performance
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((user) => (
                  <>
                    <tr
                      key={user.user_id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        setExpandedUser(expandedUser === user.user_id ? null : user.user_id)
                      }
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.user_code}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-700">
                          {user.teams.length > 0
                            ? user.teams.map((t) => t.name).join(", ")
                            : "No Team"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-700">
                          {user.clients.length > 0
                            ? user.clients.map((c) => c.name).join(", ")
                            : "No Clients"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-indigo-600 text-lg">
                          {user.ebesScore}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getPerformanceColor(
                            user.performanceLabel
                          )}`}
                        >
                          {user.performanceLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {expandedUser === user.user_id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400 mx-auto" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                    {expandedUser === user.user_id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="py-4 px-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {user.role === "recruiter" && (
                              <>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Submissions</p>
                                  <p className="text-xl font-bold text-gray-900">
                                    {user.totalSubmissions}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Interviews</p>
                                  <p className="text-xl font-bold text-gray-900">
                                    {user.totalInterviews}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    1st: {user.interviews1st} | 2nd: {user.interviews2nd} | 3rd:{" "}
                                    {user.interviews3rd}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Deals</p>
                                  <p className="text-xl font-bold text-green-600">{user.deals}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Drop Outs</p>
                                  <p className="text-xl font-bold text-red-600">
                                    {user.dropouts}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Active Roles</p>
                                  <p className="text-xl font-bold text-blue-600">
                                    {user.activeRoles}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Non-Active Roles</p>
                                  <p className="text-xl font-bold text-gray-600">
                                    {user.nonActiveRoles}
                                  </p>
                                </div>
                              </>
                            )}
                            {user.role === "account_manager" && (
                              <>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Total Roles</p>
                                  <p className="text-xl font-bold text-gray-900">
                                    {user.totalRoles}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Active Roles</p>
                                  <p className="text-xl font-bold text-blue-600">
                                    {user.activeRoles}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Deals Closed</p>
                                  <p className="text-xl font-bold text-green-600">
                                    {user.dealsClosedRoles}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Lost Roles</p>
                                  <p className="text-xl font-bold text-red-600">
                                    {user.lostRoles}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">On Hold</p>
                                  <p className="text-xl font-bold text-yellow-600">
                                    {user.onHoldRoles}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">No Answer</p>
                                  <p className="text-xl font-bold text-gray-600">
                                    {user.noAnswerRoles}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Interviews</p>
                                  <p className="text-xl font-bold text-purple-600">
                                    {user.totalInterviews}
                                  </p>
                                </div>
                              </>
                            )}
                            {user.role === "recruitment_manager" && (
                              <>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Teams Managed</p>
                                  <p className="text-xl font-bold text-gray-900">
                                    {user.managedTeams}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Recruiters</p>
                                  <p className="text-xl font-bold text-blue-600">
                                    {user.totalRecruiters}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Total Roles</p>
                                  <p className="text-xl font-bold text-gray-900">
                                    {user.totalRoles}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Active Roles</p>
                                  <p className="text-xl font-bold text-blue-600">
                                    {user.activeRoles}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Total Deals</p>
                                  <p className="text-xl font-bold text-green-600">
                                    {user.totalDeals}
                                  </p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Interviews</p>
                                  <p className="text-xl font-bold text-purple-600">
                                    {user.totalInterviews}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {stats.length === 0 && (
              <div className="text-center py-12">
                <UserCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No users found matching your filters</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
