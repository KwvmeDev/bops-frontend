import { createContext, useContext, useState, useEffect, useCallback } from 'react';

async function detectCountryCode() {
  const cached = sessionStorage.getItem('bms_geo_country');
  if (cached) return cached;
  try {
    const res = await fetch('https://ipapi.co/country/', { signal: AbortSignal.timeout(4000) });
    const code = (await res.text()).trim();
    sessionStorage.setItem('bms_geo_country', code);
    return code;
  } catch {
    return null;
  }
}

async function fetchGhsRate() {
  const cached = sessionStorage.getItem('bms_ghs_rate');
  if (cached) return parseFloat(cached);
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=GHS', {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    const rate = data.rates?.GHS;
    if (rate) sessionStorage.setItem('bms_ghs_rate', String(rate));
    return rate ?? null;
  } catch {
    return null;
  }
}
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geoSymbol, setGeoSymbol] = useState(null);
  const [ghsRate, setGhsRate] = useState(null);

  useEffect(() => {
    // Check for existing session on mount
    const storedUser = localStorage.getItem('user');
    const storedTenant = localStorage.getItem('tenant');
    const accessToken = localStorage.getItem('accessToken');

    if (storedUser && storedTenant && accessToken) {
      setUser(JSON.parse(storedUser));
      setTenant(JSON.parse(storedTenant));
    }
    setLoading(false);

    // Geo-based currency detection (runs once per session)
    detectCountryCode().then(async code => {
      if (code === 'GH') {
        setGeoSymbol('GH₵');
        // Fetch live USD→GHS rate so plan prices convert correctly
        const rate = await fetchGhsRate();
        if (rate) setGhsRate(rate);
      } else if (code) {
        setGeoSymbol('$');
      }
      // null = API failed → fall back to tenant setting
    });
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    // Destructure all fields including emailVerified so it is persisted in localStorage
    const { user, tenant, accessToken, refreshToken } = response.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    // user object contains emailVerified from the server response
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenant', JSON.stringify(tenant));

    setUser(user);
    setTenant(tenant);

    return { user, tenant };
  };

  const register = async (data) => {
    const response = await authApi.register(data);
    // Destructure all fields including emailVerified so it is persisted in localStorage
    const { user, tenant, accessToken, refreshToken } = response.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    // user object contains emailVerified from the server response
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenant', JSON.stringify(tenant));

    setUser(user);
    setTenant(tenant);

    return { user, tenant };
  };

  // Allows components to patch the stored user (e.g. when emailVerified changes)
  const updateUser = (updatedFields) => {
    const merged = { ...user, ...updatedFields };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    setUser(null);
    setTenant(null);
  };

  const updateTenant = (newTenant) => {
    localStorage.setItem('tenant', JSON.stringify(newTenant));
    setTenant(newTenant);
  };

  const isAuthenticated = !!user;

  // Geo-override: Ghana → ₵, everywhere else → $, API failure → tenant setting
  const currencySymbol = geoSymbol ?? tenant?.currencySymbol ?? '$';

  // Converts a USD-denominated price to GHS when in Ghana, otherwise returns as-is.
  // Use ONLY for fixed USD prices (plan costs). In-app data is already in local currency.
  const convertPrice = useCallback((usdAmount) => {
    if (geoSymbol === 'GH₵' && ghsRate) {
      return Math.round(usdAmount * ghsRate);
    }
    return usdAmount;
  }, [geoSymbol, ghsRate]);

  const hasRole = (roles) => {
    if (!user) return false;
    if (typeof roles === 'string') {
      return user.role === roles;
    }
    return roles.includes(user.role);
  };

  const hasMinRole = (minRole) => {
    if (!user) return false;
    const hierarchy = { OWNER: 3, MANAGER: 2, CASHIER: 1 };
    return hierarchy[user.role] >= hierarchy[minRole];
  };

  const value = {
    user,
    tenant,
    loading,
    isAuthenticated,
    currencySymbol,
    convertPrice,
    login,
    register,
    logout,
    updateTenant,
    updateUser,
    hasRole,
    hasMinRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
