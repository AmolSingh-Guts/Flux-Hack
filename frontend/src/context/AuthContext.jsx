import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getStoredToken,
  storeToken,
  UNAUTHORIZED_EVENT,
} from '../api/client.js';
import {
  login as loginRequest,
  logout as logoutRequest,
  me as meRequest,
  register as registerRequest,
} from '../api/auth.api.js';
import { ROLE_HOME } from '../utils/constants.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(Boolean(getStoredToken()));

  const clearSession = useCallback(() => {
    storeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    meRequest()
      .then((profile) => {
        if (active) {
          setUser(profile);
        }
      })
      .catch(() => {
        if (active) {
          clearSession();
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, clearSession]);

  useEffect(() => {
    const onUnauthorized = () => clearSession();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const result = await loginRequest(credentials);
    storeToken(result.token);
    setToken(result.token);
    setUser(result.user);
    setLoading(false);

    return result.user;
  }, []);

  const register = useCallback(async (payload) => {
    const result = await registerRequest(payload);
    storeToken(result.token);
    setToken(result.token);
    setUser(result.user);
    setLoading(false);

    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // The local session is cleared even if the audit call fails.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const profile = await meRequest();
    setUser(profile);
    return profile;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
      homePath: user ? ROLE_HOME[user.role] ?? '/' : '/login',
      hasPermission: (permission) =>
        user?.role === 'ADMIN' ||
        (user?.role === 'STAFF' && (user?.permissions ?? []).includes(permission)),
    }),
    [user, token, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}
