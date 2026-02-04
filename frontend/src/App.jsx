import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthHandler from './components/AuthHandler';
import GoogleAdSenseLoader from './components/GoogleAdSenseLoader';
import AdBlockDetector from './components/AdBlockDetector';
import { AdProvider } from './context/AdContext';
import { ThemeProvider } from './context/ThemeContext';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load heavy components
const ChatAssistant = lazy(() => import('./components/ChatAssistant'));

// Lazy load all route pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const NoteDetails = lazy(() => import('./pages/NoteDetails'));
const MyPurchases = lazy(() => import('./pages/MyPurchases'));
const Subscription = lazy(() => import('./pages/Subscription'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const MyAccount = lazy(() => import('./pages/MyAccount'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Support = lazy(() => import('./pages/Support'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const CancellationRefund = lazy(() => import('./pages/CancellationRefund'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AdProvider>
        <Router>
          <AuthHandler />
          <GoogleAdSenseLoader />
          <AdBlockDetector />
          <Suspense fallback={null}>
            <ChatAssistant />
          </Suspense>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
            <Navbar />
            <div className="flex-grow">
              <Suspense fallback={<PageLoader />}>
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
                  {/* Legal Pages */}
                  <Route path="/support" element={<Support />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/cancellation-refund" element={<CancellationRefund />} />
                </Routes>
              </Suspense>
            </div>
            <Footer />
          </div>
        </Router>
      </AdProvider>
    </ThemeProvider>
  );
}

export default App;
