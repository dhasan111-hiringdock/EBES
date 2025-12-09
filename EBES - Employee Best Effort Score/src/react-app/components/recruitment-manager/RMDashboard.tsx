import { useState, useEffect } from 'react';
import { Briefcase, Users, TrendingUp, Award, Target, CheckCircle, XCircle, AlertCircle, Clock, PhoneOff } from 'lucide-react';
import { fetchWithAuth } from '@/react-app/utils/api';

interface Client {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
}

interface Recruiter {
  id: number;
  name: string;
  user_code: string;
}

interface TeamBreakdown {
  team_id: number;
  team_name: string;
  team_code: string;
  total_roles: number;
  active_roles: number;
  interviews: number;
  deals: number;
  lost: number;
  on_hold: number;
  no_answer: number;
}

interface RecruiterBreakdown {
  recruiter_id: number;
  recruiter_name: string;
  recruiter_code: string;
  total_submissions: number;
  interviews: number;
  deals: number;
  lost_roles: number;
}

interface Analytics {
  total_teams: number;
  total_recruiters: number;
  total_active_roles: number;
  total_non_active_roles: number;
  total_interviews: number;
  total_deals: number;
  total_lost: number;
  total_on_hold: number;
  total_no_answer: number;
  team_breakdown: TeamBreakdown[];
  recruiter_breakdown: RecruiterBreakdown[];
}

interface EBESData {
  score: number;
  performance_label: string;
  total_submissions: number;
  total_interviews: number;
  total_deals: number;
  total_roles: number;
  active_roles: number;
}

export default function RMDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedRecruiter, setSelectedRecruiter] = useState<string>('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [ebesData, setEbesData] = useState<EBESData | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('current_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedClient, selectedTeam, selectedRecruiter, startDate, endDate]);

  useEffect(() => {
    fetchEBESScore();
  }, [dateFilter, startDate, endDate]);

  const fetchInitialData = async () => {
    try {
      const [clientsRes, teamsRes, recruitersRes] = await Promise.all([
        fetchWithAuth('/api/rm/clients'),
        fetchWithAuth('/api/rm/teams'),
        fetchWithAuth('/api/rm/recruiters')
      ]);

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
      }

      if (recruitersRes.ok) {
        const recruitersData = await recruitersRes.json();
        setRecruiters(recruitersData);
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
      if (selectedTeam) params.append('team_id', selectedTeam);
      if (selectedRecruiter) params.append('recruiter_id', selectedRecruiter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetchWithAuth(`/api/rm/analytics?${params.toString()}`);
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
      
      if (dateFilter === 'current_month') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        params.append('start_date', start.toISOString().split('T')[0]);
        params.append('end_date', end.toISOString().split('T')[0]);
      } else if (dateFilter === 'last_month') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        params.append('start_date', start.toISOString().split('T')[0]);
        params.append('end_date', end.toISOString().split('T')[0]);
      } else if (dateFilter === 'custom' && startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      }

      const response = await fetchWithAuth(`/api/rm/ebes-score?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEbesData(data);
      }
    } catch (error) {
      console.error('Failed to fetch EBES score:', error);
    }
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
              { value: 'custom', label: 'Custom Range' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setDateFilter(filter.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  dateFilter === filter.value
                    ? 'bg-white text-indigo-600 shadow-md'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="mb-6 flex gap-4">
            <div>
              <label className="block text-sm text-indigo-100 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 rounded-lg text-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm text-indigo-100 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 rounded-lg text-slate-800"
              />
            </div>
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

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Teams</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Recruiter</label>
            <select
              value={selectedRecruiter}
              onChange={(e) => setSelectedRecruiter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Recruiters</option>
              {recruiters.map(recruiter => (
                <option key={recruiter.id} value={recruiter.id}>
                  {recruiter.name} ({recruiter.user_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date Range Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date Range End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Analytics Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">Teams</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics?.total_teams || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">Recruiters</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics?.total_recruiters || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">Active Roles</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics?.total_active_roles || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-slate-500 to-gray-500 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">Non-Active</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics?.total_non_active_roles || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">Interviews</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics?.total_interviews || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">Deals</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics?.total_deals || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">Lost</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics?.total_lost || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">On Hold</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics?.total_on_hold || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-slate-500 rounded-lg flex items-center justify-center">
              <PhoneOff className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">No Answer</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{analytics?.total_no_answer || 0}</p>
        </div>
      </div>

      {/* Team Performance Breakdown */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Team Performance Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Team</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total Roles</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Active</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Interviews</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Deals</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Lost</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">On Hold</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">No Answer</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.team_breakdown.map((team) => (
                <tr key={team.team_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-slate-800">{team.team_name}</p>
                      <p className="text-sm text-slate-500">{team.team_code}</p>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 font-semibold text-slate-800">{team.total_roles}</td>
                  <td className="text-right py-3 px-4 text-emerald-600 font-semibold">{team.active_roles}</td>
                  <td className="text-right py-3 px-4 text-indigo-600 font-semibold">{team.interviews}</td>
                  <td className="text-right py-3 px-4 text-yellow-600 font-semibold">{team.deals}</td>
                  <td className="text-right py-3 px-4 text-red-600 font-semibold">{team.lost}</td>
                  <td className="text-right py-3 px-4 text-amber-600 font-semibold">{team.on_hold}</td>
                  <td className="text-right py-3 px-4 text-gray-600 font-semibold">{team.no_answer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recruiter Contribution View */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Recruiter Contribution View</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Recruiter</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total Submissions</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Interviews</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Deals</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Lost Roles</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.recruiter_breakdown.map((recruiter) => (
                <tr key={recruiter.recruiter_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-slate-800">{recruiter.recruiter_name}</p>
                      <p className="text-sm text-slate-500">{recruiter.recruiter_code}</p>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 font-semibold text-slate-800">{recruiter.total_submissions}</td>
                  <td className="text-right py-3 px-4 text-indigo-600 font-semibold">{recruiter.interviews}</td>
                  <td className="text-right py-3 px-4 text-yellow-600 font-semibold">{recruiter.deals}</td>
                  <td className="text-right py-3 px-4 text-red-600 font-semibold">{recruiter.lost_roles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
