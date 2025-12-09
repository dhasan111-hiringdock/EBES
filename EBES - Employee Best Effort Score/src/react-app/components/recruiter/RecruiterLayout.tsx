import { NavLink } from "react-router";
import { LayoutDashboard, UserCircle, LogOut } from "lucide-react";
import { useAuth } from "@/react-app/hooks/useAuth";

interface RecruiterLayoutProps {
  children: React.ReactNode;
}

export default function RecruiterLayout({ children }: RecruiterLayoutProps) {
  const { user, logout } = useAuth();
  
  const navItems = [
    { to: "/recruiter", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/recruiter/profile", icon: UserCircle, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-indigo-600">EBES Recruiter</h1>
              <div className="hidden md:flex gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/recruiter"}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-indigo-100 text-indigo-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {user?.email} ({user?.name})
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
