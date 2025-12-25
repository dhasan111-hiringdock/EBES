import { useState } from "react";
import { X, Download, FileText, FileSpreadsheet } from "lucide-react";

interface ReportDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Array<{ id: number; name: string; team_code: string }>;
  clients: Array<{ id: number; name: string; client_code: string }>;
  onDownload: (filters: ReportFilters, format: 'csv' | 'excel') => void;
}

export interface ReportFilters {
  role: string;
  teamId: string;
  clientId: string;
  performanceLevel: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  searchTerm: string;
}

export default function ReportDownloadModal({
  isOpen,
  onClose,
  teams,
  clients,
  onDownload,
}: ReportDownloadModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [role, setRole] = useState('all');
  const [teamId, setTeamId] = useState('all');
  const [clientId, setClientId] = useState('all');
  const [performanceLevel, setPerformanceLevel] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const handleDownload = () => {
    const filters: ReportFilters = {
      role,
      teamId,
      clientId,
      performanceLevel,
      dateRange,
      startDate,
      endDate,
      searchTerm,
    };
    onDownload(filters, format);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Download Performance Report</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Configure filters and select format for your report
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-indigo-200">
            <label className="block text-sm font-bold text-gray-900 mb-3">
              Select Report Format
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormat('csv')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  format === 'csv'
                    ? 'border-indigo-600 bg-indigo-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}
              >
                <FileText className={`w-6 h-6 ${format === 'csv' ? 'text-indigo-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className={`font-semibold ${format === 'csv' ? 'text-indigo-900' : 'text-gray-700'}`}>
                    CSV Format
                  </p>
                  <p className="text-xs text-gray-500">Best for Excel, Google Sheets</p>
                </div>
              </button>
              <button
                onClick={() => setFormat('excel')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  format === 'excel'
                    ? 'border-green-600 bg-green-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-green-300'
                }`}
              >
                <FileSpreadsheet className={`w-6 h-6 ${format === 'excel' ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className={`font-semibold ${format === 'excel' ? 'text-green-900' : 'text-gray-700'}`}>
                    Excel Format
                  </p>
                  <p className="text-xs text-gray-500">Native .xlsx file with formatting</p>
                </div>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Report Filters
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Roles</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="account_manager">Account Manager</option>
                  <option value="recruitment_manager">Recruitment Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Performance Level Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Performance Level
                </label>
                <select
                  value={performanceLevel}
                  onChange={(e) => setPerformanceLevel(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Levels</option>
                  <option value="Excellent">Excellent (80-100)</option>
                  <option value="Good">Good (60-79)</option>
                  <option value="Average">Average (40-59)</option>
                  <option value="Needs Improvement">Needs Improvement (&lt;40)</option>
                </select>
              </div>

              {/* Team Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Search Term */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search User
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name, email, or code..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Custom Date Range */}
              {dateRange === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Report Contents Info */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Report Contents
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="font-medium text-gray-900">User Information</p>
                  <p className="text-gray-600 text-xs">Name, code, email, role</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="font-medium text-gray-900">EBES Score</p>
                  <p className="text-gray-600 text-xs">Performance rating</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Roles Count</p>
                  <p className="text-gray-600 text-xs">Active & non-active</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Submissions</p>
                  <p className="text-gray-600 text-xs">Total count</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Interviews</p>
                  <p className="text-gray-600 text-xs">By round (1st, 2nd, 3rd)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Deals & Dropouts</p>
                  <p className="text-gray-600 text-xs">Closed deals, dropouts</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Team Assignment</p>
                  <p className="text-gray-600 text-xs">Assigned teams</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Client Assignment</p>
                  <p className="text-gray-600 text-xs">Assigned clients</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Role Statistics</p>
                  <p className="text-gray-600 text-xs">Status breakdown</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all font-medium shadow-lg flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
