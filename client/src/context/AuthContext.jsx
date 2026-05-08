import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem('token'));
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const fetchUser = useCallback(async (t) => {
    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Unauthorized');
      setUser(await res.json());
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchUser(token);
    else setLoading(false);
  }, [token, fetchUser]);

  const login = useCallback(async (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    await fetchUser(newToken);
  }, [fetchUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback((url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
  }, [token]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.is_super) return true;
    const perms = user.permissions || [];
    // Trailing colon = prefix match: 'users:' matches 'users:read', 'users:write', etc.
    if (permission.endsWith(':')) return perms.some(p => p.startsWith(permission));
    return perms.includes(permission);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      token, user, login, logout, authFetch,
      isAuthenticated: !!token && !!user,
      hasPermission,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
