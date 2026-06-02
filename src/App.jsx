import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { LocationProvider } from './context/LocationContext';
import { Toaster } from './components/ui/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/public/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerified from './pages/EmailVerified';
import Dashboard from './pages/Dashboard';
import SalesScreen from './pages/SalesScreen';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Users from './pages/Users';
import StockTransfers from './pages/StockTransfers';
import PurchaseOrders from './pages/PurchaseOrders';
import Expenses from './pages/Expenses';
import Onboarding from './pages/Onboarding';
import PublicReceipt from './pages/PublicReceipt';
import LocationPicker from './pages/LocationPicker';
import Prescriptions from './pages/Prescriptions';
import Customers from './pages/Customers';
import ChatWidget from './components/ChatWidget';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Landing page */}
        <Route path="/" element={<Landing />} />

        {/* Public receipt — no auth, no Layout */}
        <Route path="/r/:token" element={<PublicReceipt />} />

        {/* Auth / public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/email-verified" element={<EmailVerified />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

        {/* Location picker — protected, no sidebar layout */}
        <Route path="pick-location" element={<ProtectedRoute><LocationPicker /></ProtectedRoute>} />

        {/* Protected app routes — pathless layout wrapper avoids '/' conflict */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sales" element={<SalesScreen />} />
          <Route path="inventory" element={<Inventory />} />
          <Route
            path="reports"
            element={
              <ProtectedRoute minRole="MANAGER">
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute minRole="MANAGER">
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute minRole="OWNER">
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="stock-transfers"
            element={
              <ProtectedRoute minRole="MANAGER">
                <StockTransfers />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchase-orders"
            element={
              <ProtectedRoute minRole="MANAGER">
                <PurchaseOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="expenses"
            element={
              <ProtectedRoute minRole="MANAGER">
                <Expenses />
              </ProtectedRoute>
            }
          />
          {/* Pharmacy: Prescriptions — CASHIER+ (feature-flagged in the page itself) */}
          <Route
            path="prescriptions"
            element={
              <ProtectedRoute minRole="CASHIER">
                <Prescriptions />
              </ProtectedRoute>
            }
          />
          {/* Customers — MANAGER+ */}
          <Route
            path="customers"
            element={
              <ProtectedRoute minRole="MANAGER">
                <Customers />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LocationProvider>
            <SubscriptionProvider>
              <AnimatedRoutes />
              <Toaster />
              <ChatWidget />
            </SubscriptionProvider>
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
