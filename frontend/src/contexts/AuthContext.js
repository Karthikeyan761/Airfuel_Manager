import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi } from '../api/services';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await authApi.profile();
          setUser(res.data);
        } catch {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  /**
   * Returns { success: true } or { success: false, error: string }
   */
  const login = async (username, password) => {
    try {
      const res = await authApi.login(username, password);
      localStorage.setItem('token', res.data.access_token);
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      console.error('Login Error:', err);
      const backendError = err.response?.data?.error;
      const status = err.response?.status;
      const msg = backendError 
        ? `${backendError} (Status: ${status})` 
        : `Network/CORS Error: ${err.message}. Backend: ${err.config?.url}`;
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
