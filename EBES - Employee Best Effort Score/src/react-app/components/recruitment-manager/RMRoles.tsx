import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Briefcase, CheckCircle, XCircle } from 'lucide-react';

interface Role {
  id: number;
  role_code: string;
  title: string;
  description: string;
  status: string;
  client_name: string;
  client_code: string;
  team_name: string;
  team_code: string;
  account_manager_name: string;
  account_manager_code: string;
  created_at: string;
}

interface Client {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
}

export default function RMRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [statusFilter, clientFilter, teamFilter]);

  const fetchInitialData = async () => {
    try {
      const [clientsRes, teamsRes] = await Promise.all([
        fetch('/api/rm/clients'),
        fetch('/api/rm/teams')
      ]);

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (statusFilter === 'active') params.append('status', 'active');
      else if (statusFilter === 'non-active') params.append('status', 'non-active');
      
      if (clientFilter) params.append('client_id', clientFilter);
      if (teamFilter) params.append('team_id', teamFilter);

      const response = await fetch(`/api/rm/roles?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = 
      role.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.role_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800';
      case 'deal': return 'bg-blue-100 text-blue-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'no_answer': return 'bg-orange-100 text-orange-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'deal': return <CheckCircle className="w-4 h-4" />;
      default: return <XCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Roles</h2>
          <p className="text-slate-500 mt-1">View and monitor all assigned roles</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search roles..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="active">Active Only</option>
              <option value="non-active">Non-Active</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Client</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Team</label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Teams</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No roles found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Role Code</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Title</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Client</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Team</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Account Manager</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-indigo-600">
                        {role.role_code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{role.title}</div>
                      {role.description && (
                        <div className="text-sm text-slate-500 truncate max-w-xs">
                          {role.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-800">{role.client_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{role.client_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-800">{role.team_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{role.team_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-800">{role.account_manager_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{role.account_manager_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(role.status)}`}>
                        {getStatusIcon(role.status)}
                        {role.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedRole(role)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Details Modal */}
      {selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Role Details</h3>
              <button
                onClick={() => setSelectedRole(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-500">Role Code</label>
                <p className="text-lg font-mono font-semibold text-indigo-600 mt-1">
                  {selectedRole.role_code}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500">Title</label>
                <p className="text-lg font-semibold text-slate-800 mt-1">
                  {selectedRole.title}
                </p>
              </div>

              {selectedRole.description && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Description</label>
                  <p className="text-slate-700 mt-1">{selectedRole.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-slate-500">Client</label>
                  <p className="text-slate-800 mt-1">{selectedRole.client_name}</p>
                  <p className="text-sm text-slate-500 font-mono">{selectedRole.client_code}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Team</label>
                  <p className="text-slate-800 mt-1">{selectedRole.team_name}</p>
                  <p className="text-sm text-slate-500 font-mono">{selectedRole.team_code}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500">Account Manager</label>
                <p className="text-slate-800 mt-1">{selectedRole.account_manager_name}</p>
                <p className="text-sm text-slate-500 font-mono">{selectedRole.account_manager_code}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500">Status</label>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRole.status)}`}>
                    {getStatusIcon(selectedRole.status)}
                    {selectedRole.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500">Created</label>
                <p className="text-slate-700 mt-1">
                  {new Date(selectedRole.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
