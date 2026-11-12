import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsBusinessSelection, setNeedsBusinessSelection] = useState(false);

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
      const bizList = bizRes.data.data || [];
      setBusinesses(bizList);

      const savedBizId = localStorage.getItem('active_business_id');
      const confirmed = sessionStorage.getItem('business_confirmed') === 'true';

      if (bizList.length > 1 && !confirmed && !userData?.is_superuser) {
        setNeedsBusinessSelection(true);
      } else {
        setNeedsBusinessSelection(false);
      }

      const activeBiz = bizList.find((b) => b.id === savedBizId) || bizList[0];

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

  const login = async (email, password) => {
    const res = await api.post('/auth/login/', { email, password });
    const payload = res.data?.data || res.data;
    const access = payload?.access;
    const refresh = payload?.refresh;
    if (access) localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
    await fetchSession();
  };

  const register = async (registerData) => {
    const res = await api.post('/auth/register/', registerData);
    const payload = res.data?.data || res.data;
    const tokens = payload?.tokens || payload;
    if (tokens?.access) {
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);
      await fetchSession();
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('active_business_id');
    sessionStorage.removeItem('business_confirmed');
    setUser(null);
    setBusiness(null);
    setBusinesses([]);
    setRoles([]);
    setPermissions([]);
    setNeedsBusinessSelection(false);
  };

  const selectBusiness = async (businessId) => {
    localStorage.setItem('active_business_id', businessId);
    sessionStorage.setItem('business_confirmed', 'true');
    setNeedsBusinessSelection(false);
    try {
      const res = await api.post('/auth/me/switch-business/', { business_id: businessId });
      setRoles(res.data?.data?.roles || []);
      setPermissions(res.data?.data?.permissions || []);
    } catch (err) {
      console.error('Select business failed', err);
    }
    const found = businesses.find((b) => b.id === businessId);
    if (found) setBusiness(found);
  };

  const switchBusiness = async (businessId) => {
    await selectBusiness(businessId);
    window.location.reload();
  };

  const createBusiness = async (businessData) => {
    const res = await api.post('/businesses/', businessData);
    const created = res.data?.data || res.data;
    if (created?.id) {
      localStorage.setItem('active_business_id', created.id);
      await fetchSession();
      window.location.reload();
    }
    return created;
  };

  const activeRole = roles.length > 0 ? roles[0] : (user?.role || (user?.is_superuser ? 'SUPER_ADMIN' : 'EMPLOYEE'));

  const hasPermission = (perm) => {
    if (user?.is_superuser) return true;
    if (roles.includes('BUSINESS_OWNER') || roles.includes('SUPER_ADMIN')) return true;
    if (Array.isArray(perm)) {
      return perm.some((p) => permissions.includes(p));
    }
    return permissions.includes(perm);
  };

  const hasRole = (role) => {
    if (user?.is_superuser) return true;
    const currentRoles = roles.length > 0 ? roles : (user?.role ? [user.role] : []);
    if (Array.isArray(role)) {
      return role.some((r) => currentRoles.includes(r));
    }
    return currentRoles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        businesses,
        roles,
        permissions,
        activeRole,
        isAuthenticated: !!user,
        isLoading,
        needsBusinessSelection,
        login,
        register,
        logout,
        selectBusiness,
        switchBusiness,
        createBusiness,
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

