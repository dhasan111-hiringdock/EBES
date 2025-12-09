import { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { LayoutDashboard, UserCircle, Target, LogOut, Users, BarChart3 } from "lucide-react";
import { useAuth } from "@/react-app/hooks/useAuth";

interface RecruitmentManagerLayoutProps {
  children: ReactNode;
}

export default function RecruitmentManagerLayout({ children }: RecruitmentManagerLayoutProps) {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { path: "/rm", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/rm/analytics", icon: BarChart3, label: "Analytics & EBES" },
    { path: "/rm/roles", icon: Target, label: "Roles" },
    { path: "/rm/team", icon: Users, label: "Team Management" },
    { path: "/rm/profile", icon: UserCircle, label: "Profile" },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-xl border-r border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">EBES</h1>
              <p className="text-sm text-slate-500">Recruitment Manager</p>
            </div>
          </div>
        </div>
        
        <nav className="mt-6 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-all duration-200
                  ${isActive 
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          <div className="mt-8 pt-8 border-t border-slate-200">
            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">
              {navItems.find(item => item.path === location.pathname)?.label || "Dashboard"}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                <UserCircle className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
