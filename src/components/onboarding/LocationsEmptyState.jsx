import { MapPin } from 'lucide-react';

// Shown inside the Settings > Locations tab when only the default location
// exists (locations.length <= 1). The parent component controls visibility —
// no local localStorage dismiss because it naturally disappears once the user
// adds a second location and the parent re-renders with locations.length > 1.
export default function LocationsEmptyState() {
  const handleScrollToForm = () => {
    document.getElementById('add-location-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="text-center py-8 mb-6">
      {/* Icon */}
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 mx-auto mb-4">
        <MapPin className="w-7 h-7 text-brand-light" />
      </div>

      {/* Heading */}
      <h3 className="text-base font-semibold text-zinc-200 mb-1.5">
        This is your default location
      </h3>

      {/* Sub-text */}
      <p className="text-sm text-zinc-500 max-w-xs mx-auto mb-5">
        Add more locations to manage multiple branches — each with its own staff, stock, and sales.
      </p>

      {/* CTA */}
      <button
        onClick={handleScrollToForm}
        className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg transition-colors"
      >
        Add a Branch
      </button>
    </div>
  );
}
