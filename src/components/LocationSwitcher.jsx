import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, MapPin } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { useAuth } from '../context/AuthContext';

// LocationSwitcher renders a compact dropdown in the sidebar that lets users
// switch between branch locations (or "All Locations" for OWNERs).
// Returns null for single-location tenants — completely invisible to them.
export default function LocationSwitcher() {
  const { locations, activeLocation, setActiveLocation, isMultiLocation } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Single-location tenants never see this component
  if (!isMultiLocation) return null;

  const isOwner = user?.role === 'OWNER';

  // Derive display label — sentinel __all__ shows "All Locations"
  const displayName = activeLocation?.id === '__all__'
    ? 'All Locations'
    : (activeLocation?.name ?? 'Select Location');

  const handleSelect = (location) => {
    setActiveLocation(location);
    setIsOpen(false);
    // If the user is on the location picker page, redirect them into the app
    if (routerLocation.pathname === '/pick-location') {
      navigate('/dashboard');
    }
  };

  // Close dropdown when user clicks outside
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  return (
    <div ref={containerRef} className="px-2 py-2 border-b border-surface-muted/50 flex-shrink-0">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-muted/60 hover:bg-surface-muted text-zinc-300 hover:text-zinc-100 transition-colors text-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-brand-light" />
        <span className="flex-1 text-left truncate font-medium text-xs">{displayName}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        </motion.span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-1 mx-1 rounded-lg bg-zinc-900 border border-zinc-700/60 shadow-lg overflow-hidden z-50"
          >
            {/* "All Locations" option — visible to OWNERs only */}
            {isOwner && (
              <li>
                <button
                  role="option"
                  aria-selected={activeLocation?.id === '__all__'}
                  onClick={() => handleSelect({ id: '__all__', name: 'All Locations' })}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                    activeLocation?.id === '__all__'
                      ? 'bg-brand/10 text-brand-light'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate font-medium">All Locations</span>
                  {activeLocation?.id === '__all__' && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-light flex-shrink-0" />
                  )}
                </button>
              </li>
            )}

            {/* Divider between "All Locations" and individual branches */}
            {isOwner && locations.length > 0 && (
              <li className="border-t border-zinc-700/50 my-0.5" aria-hidden="true" />
            )}

            {/* Individual branch options */}
            {locations.map((location) => (
              <li key={location.id}>
                <button
                  role="option"
                  aria-selected={activeLocation?.id === location.id}
                  onClick={() => handleSelect(location)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                    activeLocation?.id === location.id
                      ? 'bg-brand/10 text-brand-light'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate font-medium">{location.name}</span>
                  {activeLocation?.id === location.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-light flex-shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
