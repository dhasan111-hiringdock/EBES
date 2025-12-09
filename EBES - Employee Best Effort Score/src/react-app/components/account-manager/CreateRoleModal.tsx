import { useState } from "react";
import { X } from "lucide-react";

interface CreateRoleModalProps {
  clientId: number;
  teamId: number;
  onClose: () => void;
  onRoleCreated: () => void;
}

export default function CreateRoleModal({
  clientId,
  teamId,
  onClose,
  onRoleCreated,
}: CreateRoleModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/am/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          team_id: teamId,
          title: formData.title,
          description: formData.description,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedCode(data.role_code);
        setTimeout(() => {
          onRoleCreated();
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create role");
      }
    } catch (err) {
      setError("An error occurred while creating the role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {createdCode ? (
          <div className="text-center space-y-4">
            <div className="text-green-500 text-5xl">✓</div>
            <h3 className="text-2xl font-bold text-gray-900">Role Created!</h3>
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Role Code</p>
              <p className="text-3xl font-bold text-indigo-600 font-mono">{createdCode}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Create New Role</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="Brief description of the role"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Role"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
