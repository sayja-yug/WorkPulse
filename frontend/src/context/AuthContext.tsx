import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { User, Business } from '../types';

interface AuthContextType {
  user: User | null;
  business: Business | null;
  businesses: Business[];
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchBusiness: (businessId: string) => Promise<void>;
  hasPermission: (perm: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSession = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userRes = await api.get('/auth/me/');
      const userData = userRes.data.data;
      setUser(userData);

      const bizRes = await api.get('/auth/me/businesses/');
      const bizList = bizRes.data.data;
      setBusinesses(bizList);

      const savedBizId = localStorage.getItem('active_business_id');
      const activeBiz = bizList.find((b: any) => b.id === savedBizId) || bizList[0];

      if (activeBiz) {
        setBusiness(activeBiz);
        localStorage.setItem('active_business_id', activeBiz.id);

        const permRes = await api.get('/auth/me/permissions/');
        setRoles(permRes.data.data.roles || []);
        setPermissions(permRes.data.data.permissions || []);
      }
    } catch (err) {
      console.error('Session load failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login/', { email, password });
    const { access, refresh } = res.data.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    await fetchSession();
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('active_business_id');
    setUser(null);
    setBusiness(null);
    setBusinesses([]);
    setRoles([]);
    setPermissions([]);
  };

  const switchBusiness = async (businessId: string) => {
    localStorage.setItem('active_business_id', businessId);
    const res = await api.post('/auth/me/switch-business/', { business_id: businessId });
    setRoles(res.data.data.roles || []);
    setPermissions(res.data.data.permissions || []);
    const found = businesses.find((b) => b.id === businessId);
    if (found) setBusiness(found);
  };

  const hasPermission = (perm: string) => {
    if (user?.is_superuser) return true;
    return permissions.includes(perm);
  };

  const hasRole = (role: string) => {
    if (user?.is_superuser) return true;
    return roles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        businesses,
        roles,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchBusiness,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

