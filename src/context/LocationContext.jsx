import { createContext, useContext, useState, useEffect } from 'react';
import { locationsApi } from '../api/client';
import { useAuth } from './AuthContext';

// Sentinel value representing "all locations" — used when a multi-location
// tenant has not yet filtered down to a specific branch.
export const ALL_LOCATIONS_SENTINEL = { id: '__all__', name: 'All Locations' };

const SESSION_KEY = 'klevr_active_location';

export const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [locations, setLocations] = useState([]);
  const [activeLocation, setActiveLocationState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore persisted active location from sessionStorage on mount.
  // This runs once; the locations fetch below may then override the selection
  // if sessionStorage held a stale value, but for single-location tenants the
  // auto-select logic in the fetch effect handles that case.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        setActiveLocationState(JSON.parse(raw));
      }
    } catch {
      // Corrupted sessionStorage entry — ignore and start fresh
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  // Fetch locations whenever the user becomes authenticated.
  // Guard is important: the API will 401 if called before login.
  useEffect(() => {
    if (!isAuthenticated) {
      // User is logged out — wipe all location state + sessionStorage so the
      // next login starts fresh and re-runs the location picker if needed.
      sessionStorage.removeItem(SESSION_KEY);
      setActiveLocationState(null);
      setLocations([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchLocations() {
      setLoading(true);
      try {
        const response = await locationsApi.getAll();
        if (cancelled) return;

        const fetched = response.data?.data ?? response.data ?? [];
        setLocations(fetched);

        // Auto-select logic: only touch activeLocation when sessionStorage is
        // empty (i.e., no explicit user preference is already persisted).
        const hasPersisted = sessionStorage.getItem(SESSION_KEY) !== null;
        if (!hasPersisted) {
          if (fetched.length === 1) {
            // Single-location tenant — silently pre-select the only branch
            setActiveLocationState(fetched[0]);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(fetched[0]));
          }
          // Multi-location tenants start with null so the UI can prompt a choice
        }
      } catch {
        // API unavailable or not yet deployed — degrade gracefully
        if (!cancelled) setLocations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLocations();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Persist and expose active location changes
  const setActiveLocation = (location) => {
    setActiveLocationState(location);
    if (location) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(location));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  };

  // Called on logout — wipes all location state from memory and sessionStorage
  const clearLocation = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setActiveLocationState(null);
    setLocations([]);
  };

  // isMultiLocation drives whether branch-picker UI elements are shown
  const isMultiLocation = locations.length > 1;

  const value = {
    locations,
    activeLocation,
    setActiveLocation,
    clearLocation,
    isMultiLocation,
    loading,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export default LocationContext;
