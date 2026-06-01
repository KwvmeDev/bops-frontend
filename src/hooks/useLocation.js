import { useContext } from 'react';
import { LocationContext } from '../context/LocationContext';

// Custom hook for consuming LocationContext.
// Named useLocation (not useRouterLocation) to match the domain concept —
// "location" here means a physical branch, not a URL path.
// Do not confuse with React Router's useLocation(); if both are needed in the
// same file, import React Router's version with an alias:
//   import { useLocation as useRouterLocation } from 'react-router-dom';
export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

export default useLocation;
