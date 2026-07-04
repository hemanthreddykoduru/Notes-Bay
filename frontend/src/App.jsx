import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import AuthHandler from './components/features/auth/AuthHandler';
import GoogleAdSenseLoader from './components/features/ads/GoogleAdSenseLoader';
import AdBlockDetector from './components/features/ads/AdBlockDetector';
import { AdProvider } from './context/AdContext';
import { ThemeProvider } from './context/ThemeContext';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/features/auth/ProtectedRoute';
import ScrollToTop from './components/layout/ScrollToTop';

// Skeletons
import HomeSkeleton from './components/skeletons/HomeSkeleton';
import AuthSkeleton from './components/skeletons/AuthSkeleton';
import SubscriptionSkeleton from './components/skeletons/SubscriptionSkeleton';
import MyAccountSkeleton from './components/skeletons/MyAccountSkeleton';
import MyPurchasesSkeleton from './components/skeletons/MyPurchasesSkeleton';
import NoteDetailSkeleton from './components/skeletons/NoteDetailSkeleton';
import GenericPageSkeleton from './components/skeletons/GenericPageSkeleton';

// Lazy load heavy components
const ChatAssistant = lazy(() => import('./components/features/chat/ChatAssistant'));

// Lazy load all route pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const NoteDetails = lazy(() => import('./pages/NoteDetails'));
const MyPurchases = lazy(() => import('./pages/MyPurchases'));
const Subscription = lazy(() => import('./pages/Subscription'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetails = lazy(() => import('./pages/CourseDetails'));
const LearningDashboard = lazy(() => import('./pages/LearningDashboard'));
const MyAccount = lazy(() => import('./pages/MyAccount'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Support = lazy(() => import('./pages/Support'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const CancellationRefund = lazy(() => import('./pages/CancellationRefund'));
const MyLearning = lazy(() => import('./pages/MyLearning'));

function App() {
  return (
    <ThemeProvider>
      <AdProvider>
        <Router>
          <ScrollToTop />
          <AuthHandler />
          <GoogleAdSenseLoader />
          <AdBlockDetector />
          <Suspense fallback={null}>
            <ChatAssistant />
          </Suspense>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
            <Navbar />
            <div className="flex-grow">
              <Routes>
                {/* Redirect root to /home */}
                <Route path="/" element={<Navigate to="/home" replace />} />

                {/* Home */}
                <Route path="/home" element={
                  <Suspense fallback={<HomeSkeleton />}>
                    <Home />
                  </Suspense>
                } />

                {/* Auth */}
                <Route path="/login" element={
                  <Suspense fallback={<AuthSkeleton />}>
                    <Login />
                  </Suspense>
                } />
                <Route path="/update-password" element={
                  <Suspense fallback={<AuthSkeleton />}>
                    <UpdatePassword />
                  </Suspense>
                } />

                {/* Notes */}
                <Route path="/notes/:id" element={
                  <Suspense fallback={<NoteDetailSkeleton />}>
                    <NoteDetails />
                  </Suspense>
                } />

                {/* E-Learning Routes */}
                <Route path="/courses" element={
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <Courses />
                  </Suspense>
                } />
                <Route path="/courses/:id" element={
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <CourseDetails />
                  </Suspense>
                } />
                <Route path="/learn/:id" element={
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <ProtectedRoute>
                      <LearningDashboard />
                    </ProtectedRoute>
                  </Suspense>
                } />

                {/* Specific Functional Pages */}
                <Route path="/pricing" element={
                  <Suspense fallback={<SubscriptionSkeleton />}>
                    <Subscription />
                  </Suspense>
                } />

                {/* Account & Protected Routes */}
                <Route
                  path="/my-purchases"
                  element={
                    <Suspense fallback={<MyPurchasesSkeleton />}>
                      <ProtectedRoute>
                        <MyPurchases />
                      </ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route path="/admin" element={
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  </Suspense>
                } />
                <Route path="/wishlist" element={
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <ProtectedRoute>
                      <Wishlist />
                    </ProtectedRoute>
                  </Suspense>
                } />
                <Route
                  path="/account"
                  element={
                    <Suspense fallback={<MyAccountSkeleton />}>
                      <ProtectedRoute>
                        <MyAccount />
                      </ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/my-learning"
                  element={
                    <Suspense fallback={<GenericPageSkeleton />}>
                      <ProtectedRoute>
                        <MyLearning />
                      </ProtectedRoute>
                    </Suspense>
                  }
                />

                {/* Legal & Text Pages */}
                <Route path="/support" element={
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <Support />
                  </Suspense>
                } />
                <Route path="/terms-of-service" element={
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <TermsOfService />
                  </Suspense>
                } />
                <Route path="/privacy-policy" element={
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <PrivacyPolicy />
                  </Suspense>
                } />
                <Route path="/cancellation-refund" element={
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <CancellationRefund />
                  </Suspense>
                } />
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
