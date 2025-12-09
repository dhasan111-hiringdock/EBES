import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { User, Team, Client } from "@/shared/types";
import { fetchWithAuth } from "@/react-app/utils/api";

interface UserAssignmentsModalProps {
  user: User;
  onClose: () => void;
}

export default function UserAssignmentsModal({ user, onClose }: UserAssignmentsModalProps) {
  const [assignments, setAssignments] = useState<{ teams: Team[]; clients: Client[] }>({
    teams: [],
    clients: [],
  });
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    try {
      const [assignmentsRes, teamsRes, clientsRes] = await Promise.all([
        fetchWithAuth(`/api/admin/users/${user.id}/assignments`),
        fetchWithAuth("/api/admin/teams"),
        fetchWithAuth("/api/admin/clients"),
      ]);

      if (assignmentsRes.ok && teamsRes.ok && clientsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        const teamsData = await teamsRes.json();
        const clientsData = await clientsRes.json();

        setAssignments(assignmentsData);
        setAllTeams(teamsData);
        setAllClients(clientsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeam = async (teamId: number) => {
    try {
      const response = await fetchWithAuth("/api/admin/assign-team", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, team_id: teamId }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to assign team:", error);
    }
  };

  const handleAssignClient = async (clientId: number) => {
    try {
      const response = await fetchWithAuth("/api/admin/assign-client", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, client_id: clientId }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to assign client:", error);
    }
  };

  const handleUnassignTeam = async (teamId: number) => {
    try {
      const response = await fetchWithAuth("/api/admin/unassign-team", {
        method: "DELETE",
        body: JSON.stringify({ user_id: user.id, team_id: teamId }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to unassign team:", error);
    }
  };

  const handleUnassignClient = async (clientId: number) => {
    try {
      const response = await fetchWithAuth("/api/admin/unassign-client", {
        method: "DELETE",
        body: JSON.stringify({ user_id: user.id, client_id: clientId }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to unassign client:", error);
    }
  };

  const unassignedTeams = allTeams.filter(
    (team) => !assignments.teams.find((t) => t.id === team.id)
  );

  const unassignedClients = allClients.filter(
    (client) => !assignments.clients.find((c) => c.id === client.id)
  );

  const showTeams =
    user.role === "recruitment_manager" || user.role === "account_manager";
  const showClients = user.role === "account_manager" || user.role === "recruitment_manager";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Manage Assignments</h3>
            <p className="text-gray-600 mt-1">
              {user.name} ({user.user_code})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {showTeams && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Team Assignments</h4>
                <div className="space-y-2">
                  {assignments.teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{team.name}</p>
                        <p className="text-xs text-gray-600 font-mono">{team.team_code}</p>
                      </div>
                      <button
                        onClick={() => handleUnassignTeam(team.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Unassign team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {unassignedTeams.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Assign new team:</p>
                      <div className="space-y-2">
                        {unassignedTeams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => handleAssignTeam(team.id)}
                            className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{team.name}</p>
                              <p className="text-xs text-gray-600 font-mono">{team.team_code}</p>
                            </div>
                            <Plus className="w-4 h-4 text-indigo-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {assignments.teams.length === 0 && unassignedTeams.length === 0 && (
                    <p className="text-gray-500 text-sm">No teams available</p>
                  )}
                </div>
              </div>
            )}

            {showClients && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Client Assignments</h4>
                <div className="space-y-2">
                  {assignments.clients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-600 font-mono">{client.client_code}</p>
                      </div>
                      <button
                        onClick={() => handleUnassignClient(client.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Unassign client"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {unassignedClients.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Assign new client:</p>
                      <div className="space-y-2">
                        {unassignedClients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => handleAssignClient(client.id)}
                            className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{client.name}</p>
                              <p className="text-xs text-gray-600 font-mono">
                                {client.client_code}
                              </p>
                            </div>
                            <Plus className="w-4 h-4 text-indigo-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {assignments.clients.length === 0 && unassignedClients.length === 0 && (
                    <p className="text-gray-500 text-sm">No clients available</p>
                  )}
                </div>
              </div>
            )}

            {!showTeams && !showClients && (
              <p className="text-gray-500 text-center py-8">
                {user.role === "recruiter" 
                  ? "Recruiters are assigned to teams by their Recruitment Manager."
                  : "This role does not have team or client assignments."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
