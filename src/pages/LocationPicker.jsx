import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, MapPin, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useLocation from '../hooks/useLocation';
import LocationPickerTooltip from '../components/onboarding/LocationPickerTooltip';

// Stagger container — children animate in with a 60ms cascade
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

// Individual card entrance: slides up from 20px with a spring-like ease
const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

// Shared card class for consistent styling on all location cards
const cardClasses =
  'bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-800 hover:border-zinc-700 transition-colors w-full text-left';

export default function LocationPicker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locations, setActiveLocation, loading } = useLocation();

  const isOwner = user?.role === 'OWNER';

  // Called when the user commits to a location (or "All Locations")
  const handleSelect = (location) => {
    setActiveLocation(location);
    navigate('/dashboard');
  };

  // Keyboard support: activate on Enter or Space, matching native button UX
  const handleKeyDown = (e, location) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(location);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-4 py-12">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8 text-center max-w-lg w-full"
      >
        <h1 className="text-2xl font-semibold text-zinc-100">
          Welcome, {user?.name?.split(' ')[0] || 'there'}.
        </h1>
        <p className="text-zinc-500 text-sm mt-1.5">
          Choose a location to get started.
        </p>
      </motion.div>

      {/* Card list */}
      <div className="w-full max-w-lg">
        {loading ? (
          // Skeleton state — 3 placeholder cards while the API resolves
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl bg-zinc-800 h-16"
              />
            ))}
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {/* "All Locations" sentinel card — OWNER only */}
            {isOwner && (
              <motion.div variants={cardVariant}>
                <div
                  className={cardClasses}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    handleSelect({ id: '__all__', name: 'All Locations' })
                  }
                  onKeyDown={(e) =>
                    handleKeyDown(e, { id: '__all__', name: 'All Locations' })
                  }
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-zinc-300" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">
                      All Locations
                    </p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      Combined view of all branches
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                </div>

                {/* First-visit tooltip explaining the "All Locations" option */}
                <AnimatePresence>
                  <LocationPickerTooltip onDismiss={() => {}} />
                </AnimatePresence>
              </motion.div>
            )}

            {/* Individual branch cards */}
            {locations.map((location) => (
              <motion.div key={location.id} variants={cardVariant}>
                <div
                  className={cardClasses}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(location)}
                  onKeyDown={(e) => handleKeyDown(e, location)}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-zinc-300" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">
                      {location.name}
                    </p>
                    {location.address && (
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {location.address}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
