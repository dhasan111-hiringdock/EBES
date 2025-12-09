import { useState, useEffect } from "react";
import { X, Briefcase, Calendar, FileText, CheckCircle, TrendingUp, Users, UserX } from "lucide-react";

interface Role {
  id: number;
  role_code: string;
  title: string;
  description: string;
  account_manager_name: string;
  client_id: number;
  team_id: number;
  status?: string;
}

interface Client {
  id: number;
  name: string;
  client_code: string;
  team_id: number;
  team_name: string;
  team_code: string;
}

interface AddSubmissionModalProps {
  client?: Client;
  selectedDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubmissionModal({ client, selectedDate, onClose, onSuccess }: AddSubmissionModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [dealRoles, setDealRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [submissionType, setSubmissionType] = useState<"6h" | "24h" | "after_24h">("6h");
  const [submissionDate, setSubmissionDate] = useState(selectedDate || new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // New fields for additional entry types
  const [entryType, setEntryType] = useState<"interview" | "deal" | "dropout" | null>(null);
  const [interviewLevel, setInterviewLevel] = useState<1 | 2 | 3>(1);
  const [showDropoutModal, setShowDropoutModal] = useState(false);
  const [selectedDropoutRole, setSelectedDropoutRole] = useState<Role | null>(null);

  useEffect(() => {
    if (client) {
      fetchRoles();
    }
  }, [client]);

  useEffect(() => {
    if (entryType === "dropout") {
      fetchDealRoles();
    }
  }, [entryType]);

  const fetchRoles = async () => {
    if (!client) return;
    
    try {
      const response = await fetch(`/api/recruiter/roles/${client.id}/${client.team_id}`);
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDealRoles = async () => {
    try {
      const response = await fetch('/api/recruiter/deal-roles');
      if (response.ok) {
        const data = await response.json();
        setDealRoles(data);
      }
    } catch (error) {
      console.error("Failed to fetch deal roles:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For dropout, we use the dropout role
    if (entryType === "dropout") {
      if (!selectedDropoutRole) return;
    } else {
      // For all other types, require a selected role
      if (!selectedRole) return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        submission_date: submissionDate,
        notes,
      };

      if (entryType === "dropout") {
        // Dropout uses dropout role
        payload.entry_type = "dropout";
        payload.dropout_role_id = selectedDropoutRole?.id;
        const roleDetails = dealRoles.find(r => r.id === selectedDropoutRole?.id);
        if (roleDetails) {
          payload.client_id = roleDetails.client_id;
          payload.team_id = roleDetails.team_id;
          payload.role_id = roleDetails.id;
        }
      } else {
        // All other entry types use the selected role
        if (!selectedRole || !client) return;
        
        payload.client_id = client.id;
        payload.team_id = client.team_id;
        payload.role_id = selectedRole.id;

        if (entryType === "interview") {
          payload.entry_type = "interview";
          payload.interview_level = interviewLevel;
        } else if (entryType === "deal") {
          payload.entry_type = "deal";
        } else {
          // Regular submission
          payload.entry_type = "submission";
          payload.submission_type = submissionType;
        }
      }

      const response = await fetch("/api/recruiter/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Failed to create submission:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDropoutClick = () => {
    setShowDropoutModal(true);
  };

  const handleSelectDropoutRole = (role: Role) => {
    setSelectedDropoutRole(role);
    setShowDropoutModal(false);
  };

  if (!client && !selectedDate) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Add Entry</h3>
              {client && (
                <p className="text-sm text-gray-600 mt-1">
                  {client.name} • {client.team_name}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">{submissionDate}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {loading && client ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Submission Date - Only show if not clicked from calendar */}
              {!selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entry Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={submissionDate}
                      onChange={(e) => setSubmissionDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Role Selection (comes first, required for most entry types) */}
              {client && roles.length > 0 && entryType !== "dropout" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Role *
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(selectedRole?.id === role.id ? null : role)}
                        className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                          selectedRole?.id === role.id
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-semibold text-gray-900">{role.title}</h5>
                              {selectedRole?.id === role.id && (
                                <CheckCircle className="w-5 h-5 text-indigo-600" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 font-mono mb-2">{role.role_code}</p>
                            {role.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">{role.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              AM: {role.account_manager_name}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submission Type (only visible after role is selected) */}
              {selectedRole && !entryType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Submission Type *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "6h", label: "Within 6 Hours", desc: "Fast response" },
                      { value: "24h", label: "Within 24 Hours", desc: "Same day" },
                      { value: "after_24h", label: "After 24 Hours", desc: "Standard" },
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setSubmissionType(type.value as any)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          submissionType === type.value
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-semibold text-gray-900 mb-1">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Entry Type (only visible after role is selected) */}
              {selectedRole && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Entry Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "interview", label: "Interview", icon: Users },
                      { value: "deal", label: "Deal", icon: TrendingUp },
                      { value: "dropout", label: "Drop Out", icon: UserX },
                    ].map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setEntryType(entryType === type.value ? null : type.value as any)}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            entryType === type.value
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Icon className={`w-5 h-5 mx-auto mb-2 ${entryType === type.value ? 'text-purple-600' : 'text-gray-400'}`} />
                          <div className="text-sm font-semibold text-gray-900">{type.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Interview Level Selection (only if interview is selected) */}
              {entryType === "interview" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interview Level *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setInterviewLevel(level as 1 | 2 | 3)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          interviewLevel === level
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-semibold text-gray-900">Level {level}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dropout Role Selection */}
              {entryType === "dropout" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Role with Deal *
                  </label>
                  <button
                    type="button"
                    onClick={handleDropoutClick}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedDropoutRole
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {selectedDropoutRole ? (
                      <div>
                        <div className="font-semibold text-gray-900">{selectedDropoutRole.title}</div>
                        <div className="text-xs text-gray-500 font-mono mt-1">{selectedDropoutRole.role_code}</div>
                      </div>
                    ) : (
                      <div className="text-gray-500">Click to select a role</div>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Only showing roles with deals from the past 10 entries
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    placeholder="Add any additional details..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (entryType === "dropout" ? !selectedDropoutRole : !selectedRole)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {submitting ? "Adding..." : "Add Entry"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Dropout Role Selection Modal */}
      {showDropoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Select Role with Deal</h3>
              <button
                onClick={() => setShowDropoutModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {dealRoles.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No roles with deals found in the past 10 entries</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dealRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleSelectDropoutRole(role)}
                      className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 bg-white hover:bg-indigo-50 transition-all text-left"
                    >
                      <div className="font-semibold text-gray-900">{role.title}</div>
                      <div className="text-xs text-gray-500 font-mono mt-1">{role.role_code}</div>
                      {role.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{role.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
