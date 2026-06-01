import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Detects the user's country from their device timezone — no network request,
// no third-party service, no IP address leakage.
// Africa/Accra covers Ghana (UTC+0 year-round, same as Abidjan, Dakar, etc.).
// Returns a two-letter country code string or null if detection is unavailable.
function detectCountryCode() {
  const cached = sessionStorage.getItem('bms_geo_country');
  if (cached) return Promise.resolve(cached);
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const ghanaTimezones = ['Africa/Accra', 'Africa/Abidjan', 'Africa/Bissau', 'Africa/Dakar', 'Africa/Bamako', 'Africa/Conakry', 'Africa/Freetown', 'Africa/Monrovia', 'Africa/Ouagadougou', 'Africa/Lome', 'Atlantic/Reykjavik', 'Atlantic/St_Helena'];
    const code = ghanaTimezones.includes(tz) ? 'GH' : null;
    if (code) sessionStorage.setItem('bms_geo_country', code);
    return Promise.resolve(code);
  } catch {
    return Promise.resolve(null);
  }
}

// Static fallback used when the live exchange-rate API is unavailable.
// Update periodically if the GHS rate drifts significantly. Live rate always takes precedence.
const GHS_FALLBACK_RATE = 12.5;

async function fetchGhsRate() {
  const cached = sessionStorage.getItem('bms_ghs_rate');
  if (cached) return parseFloat(cached);
  try {
    // Proxied through our own backend to avoid browser CORS restrictions on
    // direct calls to api.frankfurter.app. The server caches the rate for 1 hour.
    const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
    const res = await fetch(`${apiBase}/exchange-rate?from=USD&to=GHS`, {
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    const rate = json.data;
    if (rate) sessionStorage.setItem('bms_ghs_rate', String(rate));
    // Fall back to static rate if the API returns null so pricing is never
    // shown as raw USD with a GH₵ symbol attached.
    return rate ?? GHS_FALLBACK_RATE;
  } catch {
    return GHS_FALLBACK_RATE;
  }
}
import { authApi } from '../api/client';
import { clearTenantData } from '../lib/db';

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
        // Fetch live USDGHS rate so plan prices convert correctly
        const rate = await fetchGhsRate();
        if (rate) setGhsRate(rate);
      } else if (code) {
        setGeoSymbol('$');
      }
      // null = API failed  fall back to tenant setting
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
    // Silently include the geo-detected currency symbol so the tenant is created
    // with the right default. Falls back to '$' when geo is unresolved or non-Ghana.
    const response = await authApi.register({ ...data, currencySymbol: geoSymbol ?? '$' });
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

  const logout = async () => {
    await clearTenantData();
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

  // POS display currency comes exclusively from the tenant's saved setting.
  // geoSymbol is intentionally NOT used here — it is only for billing price
  // conversion (convertPrice below). The user controls their currency via Settings.
  const currencySymbol = tenant?.currencySymbol ?? '$';

  // Converts a USD-denominated price to GHS when in Ghana, otherwise returns as-is.
  // Use ONLY for fixed USD prices (plan costs). In-app data is already in local currency.
  // While the live rate is still fetching (ghsRate null), GHS_FALLBACK_RATE prevents
  // the brief flash of raw USD values rendered with a GH₵ symbol.
  const convertPrice = useCallback((usdAmount) => {
    if (geoSymbol === 'GH₵') {
      const rate = ghsRate ?? GHS_FALLBACK_RATE;
      return Math.round(usdAmount * rate);
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
    geoSymbol,
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
