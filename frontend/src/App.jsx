import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import NoteDetails from './pages/NoteDetails';
import MyPurchases from './pages/MyPurchases';
import Subscription from './pages/Subscription';
import ProtectedRoute from './components/ProtectedRoute';
import UpdatePassword from './pages/UpdatePassword';
import AdminDashboard from './pages/AdminDashboard';
import MyAccount from './pages/MyAccount';
import Wishlist from './pages/Wishlist';
import Support from './pages/Support';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CancellationRefund from './pages/CancellationRefund';
import AuthHandler from './components/AuthHandler';
import GoogleAdSenseLoader from './components/GoogleAdSenseLoader';
import ChatAssistant from './components/ChatAssistant';
import AdBlockDetector from './components/AdBlockDetector';
import { AdProvider } from './context/AdContext';

// Placeholders for now
const NoteDetailsPlaceholder = () => <div>Details Page</div>;
const MyPurchasesPlaceholder = () => <div>My Purchases</div>;

import { ThemeProvider } from './context/ThemeContext';
import Footer from './components/Footer';

function App() {
  return (
    <ThemeProvider>
      <AdProvider>
        <Router>
          <AuthHandler />
          <GoogleAdSenseLoader />
          <AdBlockDetector />
          <ChatAssistant />
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
            <Navbar />
            <div className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/notes/:id" element={<NoteDetails />} />
                <Route
                  path="/my-purchases"
                  element={
                    <ProtectedRoute>
                      <MyPurchases />
                    </ProtectedRoute>
                  }
                />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/wishlist" element={
                  <ProtectedRoute>
                    <Wishlist />
                  </ProtectedRoute>
                } />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route path="/pricing" element={<Subscription />} />
                <Route
                  path="/account"
                  element={
                    <ProtectedRoute>
                      <MyAccount />
                    </ProtectedRoute>
                  }
                />
                {/* Stripe Verification Pages */}
                <Route path="/support" element={<Support />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/cancellation-refund" element={<CancellationRefund />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </Router>
      </AdProvider>
    </ThemeProvider>
  );
}

export default App;
