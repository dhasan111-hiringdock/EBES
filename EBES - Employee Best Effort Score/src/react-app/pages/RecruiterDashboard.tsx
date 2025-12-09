import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router";
import RecruiterLayout from "@/react-app/components/recruiter/RecruiterLayout";
import RecruiterAnalytics from "@/react-app/pages/RecruiterAnalytics";
import { Building2, Plus, TrendingUp, Calendar as CalendarIcon, Target, Award } from "lucide-react";
import AddSubmissionModal from '@/react-app/components/recruiter/AddSubmissionModal';
import { fetchWithAuth } from "@/react-app/utils/api";

export default function RecruiterDashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetchWithAuth('/api/recruiter/clients');
      if (response.ok) {
        const clientsData = await response.json();
        setClients(clientsData);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show client selector if no client is selected
  if (!selectedClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
            Select Client
          </h2>
          <p className="text-slate-500 text-center mb-6">
            Choose a client to view their dashboard
          </p>
          <div className="space-y-3">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="w-full p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-indigo-50 hover:to-purple-50 border-2 border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {client.name}
                    </p>
                    <p className="text-sm text-slate-500 font-mono">
                      {client.client_code}
                    </p>
                    {client.team_name && (
                      <p className="text-xs text-slate-400 mt-1">
                        Team: {client.team_name} ({client.team_code})
                      </p>
                    )}
                  </div>
                  <div className="w-8 h-8 bg-indigo-100 group-hover:bg-indigo-200 rounded-lg flex items-center justify-center transition-colors">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <RecruiterLayout selectedClient={selectedClient} onClientChange={setSelectedClient}>
      <Routes>
        <Route path="/" element={<DashboardContent selectedClient={selectedClient} />} />
        <Route path="/analytics" element={<RecruiterAnalytics />} />
        <Route path="*" element={<Navigate to="/recruiter" replace />} />
      </Routes>
    </RecruiterLayout>
  );
}

interface DashboardProps {
  selectedClient: any;
}

function DashboardContent({ selectedClient }: DashboardProps) {
  const [showAddSubmission, setShowAddSubmission] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [submissionStats, setSubmissionStats] = useState<any>(null);
  const [ebesScore, setEbesScore] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, [selectedClient]);

  const fetchData = async () => {
    try {
      const submissionsResponse = await fetchWithAuth(`/api/recruiter/submissions?client_id=${selectedClient.id}`);
      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        setSubmissionStats(submissionsData.stats);
      }

      const ebesResponse = await fetchWithAuth(`/api/recruiter/ebes?filter=combined&client_id=${selectedClient.id}`);
      if (ebesResponse.ok) {
        const ebesData = await ebesResponse.json();
        setEbesScore(ebesData.score);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleAddSubmission = () => {
    setSelectedDate(null);
    setShowAddSubmission(true);
  };

  const handleSubmissionSuccess = () => {
    fetchData();
  };

  return (
    <>
      {showAddSubmission && (
        <AddSubmissionModal
          client={selectedClient}
          selectedDate={selectedDate || undefined}
          onClose={() => {
            setShowAddSubmission(false);
            setSelectedDate(null);
          }}
          onSuccess={handleSubmissionSuccess}
        />
      )}

      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={handleAddSubmission}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Entry
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">EBES Score</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {ebesScore.toFixed(1)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
              <span className="text-emerald-600 font-medium">Overall</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Submissions</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {submissionStats?.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">For {selectedClient.name}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Interviews</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {submissionStats?.interviews || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">For {selectedClient.name}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Deals</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {submissionStats?.deals || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">For {selectedClient.name}</span>
            </div>
          </div>
        </div>

        {submissionStats && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Submission Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-800 font-medium">Within 6 Hours</span>
                  <span className="text-emerald-600 font-bold text-xl">
                    {submissionStats.submission_6h || 0}
                  </span>
                </div>
                <p className="text-emerald-700 text-sm">Fast response time</p>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-800 font-medium">Within 24 Hours</span>
                  <span className="text-blue-600 font-bold text-xl">
                    {submissionStats.submission_24h || 0}
                  </span>
                </div>
                <p className="text-blue-700 text-sm">Same day submission</p>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-800 font-medium">After 24 Hours</span>
                  <span className="text-purple-600 font-bold text-xl">
                    {submissionStats.submission_after_24h || 0}
                  </span>
                </div>
                <p className="text-purple-700 text-sm">Standard submission</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Performance Summary</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-800 font-medium">This Client</span>
                  <span className="text-emerald-600 font-bold">
                    {submissionStats?.total || 0} entries
                  </span>
                </div>
                <p className="text-emerald-700 text-sm">
                  {submissionStats?.interviews || 0} interviews · {submissionStats?.deals || 0} deals
                </p>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-800 font-medium">EBES Score</span>
                  <span className="text-blue-600 font-bold text-xl">
                    {ebesScore.toFixed(1)}
                  </span>
                </div>
                <p className="text-blue-700 text-sm">Combined</p>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-800 font-medium">Response Rate</span>
                  <span className="text-purple-600 font-bold">
                    {submissionStats?.submission_6h && submissionStats?.total 
                      ? ((submissionStats.submission_6h / submissionStats.total) * 100).toFixed(0) 
                      : 0}%
                  </span>
                </div>
                <p className="text-purple-700 text-sm">Within 6 hours</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
            <h3 className="text-lg font-bold text-blue-800 mb-3">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={handleAddSubmission}
                className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Add Entry
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Monthly Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Total Entries</span>
                <span className="font-semibold text-slate-800">{submissionStats?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Interviews</span>
                <span className="font-semibold text-purple-600">{submissionStats?.interviews || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Deals Closed</span>
                <span className="font-semibold text-emerald-600">{submissionStats?.deals || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Drop Outs</span>
                <span className="font-semibold text-red-600">{submissionStats?.dropouts || 0}</span>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Conversion Rate</span>
                  <span className="font-bold text-indigo-600">
                    {submissionStats?.total 
                      ? ((submissionStats.deals / submissionStats.total) * 100).toFixed(1) + '%'
                      : '0.0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
