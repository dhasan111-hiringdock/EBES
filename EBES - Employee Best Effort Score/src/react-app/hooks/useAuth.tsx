import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'recruiter' | 'account_manager' | 'recruitment_manager';
  user_code: string;
  is_active: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    sessionStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return { user, loading, logout };
}

export function useRequireAuth(allowedRoles?: string[]) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard
        switch (user.role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'recruiter':
            navigate('/recruiter');
            break;
          case 'account_manager':
            navigate('/am');
            break;
          case 'recruitment_manager':
            navigate('/rm');
            break;
        }
      }
    }
  }, [user, loading, allowedRoles, navigate]);

  return { user, loading };
}
