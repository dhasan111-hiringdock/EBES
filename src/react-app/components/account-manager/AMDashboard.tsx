import { useState, useEffect } from 'react';
import { Target, TrendingUp, Building2, Users, AlertCircle } from 'lucide-react';
import { fetchWithAuth } from '@/react-app/utils/api';
import ScoreTooltip from '@/react-app/components/shared/ScoreTooltip';

interface Client {
  id: number;
  name: string;
  client_code: string;
  total_roles: number;
  active_roles: number;
  interviews: number;
  deals: number;
  dropouts: number;
  health: string;
}

export default function AMDashboard() {
  const [ebesScore, setEbesScore] = useState(0);
  const [ebesLabel, setEbesLabel] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [pendingDropouts, setPendingDropouts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ebesRes, clientsRes, dropoutsRes] = await Promise.all([
        fetchWithAuth('/api/am/ebes-score'),
        fetchWithAuth('/api/am/client-analytics'),
        fetchWithAuth('/api/am/dropout-requests')
      ]);

      if (ebesRes.ok) {
        const ebesData = await ebesRes.json();
        setEbesScore(ebesData.score);
        setEbesLabel(ebesData.performance_label);
      } else {
        const errorData = await ebesRes.json().catch(() => ({ error: ebesRes.statusText }));
        throw new Error(`EBES Score: ${errorData.error || ebesRes.statusText}`);
      }

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      } else {
        const errorData = await clientsRes.json().catch(() => ({ error: clientsRes.statusText }));
        console.error('Failed to fetch clients:', errorData.error);
      }

      if (dropoutsRes.ok) {
        const dropoutsData = await dropoutsRes.json();
        setPendingDropouts(dropoutsData.length);
      } else {
        const errorData = await dropoutsRes.json().catch(() => ({ error: dropoutsRes.statusText }));
        console.error('Failed to fetch dropouts:', errorData.error);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'Strong': return 'text-green-700 bg-green-100 border-green-200';
      case 'Average': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'At Risk': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'Strong': return '💪';
      case 'Average': return '😐';
      case 'At Risk': return '⚠️';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Failed to Load Dashboard</h3>
        <p className="text-slate-600 mb-4 text-center max-w-md">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard</h1>
        <p className="text-slate-600">Your performance overview and client health monitoring</p>
      </div>

      {/* Pending Dropouts Alert */}
      {pendingDropouts > 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Dropout Decisions Needed</h3>
                <p className="text-orange-100">You have {pendingDropouts} pending dropout {pendingDropouts === 1 ? 'request' : 'requests'} requiring your decision</p>
              </div>
            </div>
            <a
              href="/am/dropouts"
              className="px-6 py-3 bg-white text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors shadow-lg"
            >
              Review Now
            </a>
          </div>
        </div>
      )}

      {/* EBES Score Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Your EBES Score</h2>
            </div>
            <p className="text-indigo-100 text-sm">Employee Best Effort Score</p>
          </div>
          <ScoreTooltip type="ebes" score={ebesScore} label={ebesLabel} />
        </div>

        <div className="flex items-end gap-6">
          <div className="flex-1">
            <div className="text-6xl font-bold mb-2">{ebesScore.toFixed(1)}</div>
            <div className="flex items-center gap-2">
              <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                {ebesLabel}
              </span>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-indigo-100 mb-1">Performance Level</div>
            <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.min(ebesScore, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Client Health Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Client Health
              </h2>
              <p className="text-sm text-slate-600 mt-1">Monitor your clients' performance and engagement</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="w-4 h-4" />
              <span>{clients.length} {clients.length === 1 ? 'Client' : 'Clients'}</span>
            </div>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No client data available</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {clients.map((client) => (
              <div key={client.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">{client.name}</h3>
                      <span className="text-sm text-slate-500 font-mono">{client.client_code}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getHealthColor(client.health)}`}>
                        {getHealthIcon(client.health)} {client.health}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Total Roles</div>
                    <div className="text-2xl font-bold text-slate-800">{client.total_roles}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1">Active</div>
                    <div className="text-2xl font-bold text-blue-700">{client.active_roles}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs text-purple-600 mb-1">Interviews</div>
                    <div className="text-2xl font-bold text-purple-700">{client.interviews}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-green-600 mb-1">Deals</div>
                    <div className="text-2xl font-bold text-green-700">{client.deals}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-xs text-red-600 mb-1">Dropouts</div>
                    <div className="text-2xl font-bold text-red-700">{client.dropouts}</div>
                  </div>
                </div>

                {client.total_roles > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                      <span>Deal Conversion</span>
                      <span>
                        {client.total_roles > 0 
                          ? `${((client.deals / client.total_roles) * 100).toFixed(1)}%` 
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${client.total_roles > 0 ? (client.deals / client.total_roles) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-slate-600">Total Roles</div>
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {clients.reduce((sum, c) => sum + c.total_roles, 0)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-sm text-slate-600">Total Deals</div>
          </div>
          <div className="text-3xl font-bold text-green-700">
            {clients.reduce((sum, c) => sum + c.deals, 0)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-sm text-slate-600">Total Interviews</div>
          </div>
          <div className="text-3xl font-bold text-purple-700">
            {clients.reduce((sum, c) => sum + c.interviews, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
