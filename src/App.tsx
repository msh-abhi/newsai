import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './providers/AuthProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import Layout from './components/Layout/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import AIConfiguration from './pages/AIConfiguration';
import KnowledgeBase from './pages/KnowledgeBase';
import BrandCustomization from './pages/BrandCustomization';
import Integrations from './pages/Integrations';
import NewsletterGenerator from './pages/NewsletterGenerator';
import DraftEditor from './pages/DraftEditor';
import Distribution from './pages/Distribution';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import EventSources from './pages/EventSources';
import NewsletterManagement from './pages/NewsletterManagement';
import EventsGuide from './pages/EventsGuide';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors or missing data
        if (error?.message?.includes('Database connection failed') || 
            error?.message?.includes('SUPABASE_CONNECTION_FAILED')) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* FIX: AuthProvider must wrap the Router so all routes can access the auth context. */}
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
              <Routes>
                {/* Route 1: The public-facing landing page for authentication. */}
                <Route path="/login" element={<Landing />} />

                {/* Route 2: Events Guide landing page */}
                <Route path="/events-guide" element={<EventsGuide />} />

                {/* Route 3: All protected application routes. */}
                <Route
                  path="/app/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route index element={<Dashboard />} />
                          <Route path="ai-config" element={<AIConfiguration />} />
                          <Route path="knowledge" element={<KnowledgeBase />} />
                          <Route path="events" element={<EventSources />} />
                          <Route path="brand" element={<BrandCustomization />} />
                          <Route path="integrations" element={<Integrations />} />
                          <Route path="generate" element={<NewsletterGenerator />} />
                          <Route path="newsletters" element={<NewsletterManagement />} />
                          <Route path="editor/:id" element={<DraftEditor />} />
                          <Route path="distribution" element={<Distribution />} />
                          <Route path="analytics" element={<Analytics />} />
                          <Route path="settings" element={<Settings />} />
                          <Route path="*" element={<Navigate to="/app" replace />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Route 3: The root path (/) redirects to the login page. */}
                <Route path="/" element={<Navigate to="/login" replace />} />
              </Routes>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  className: 'dark:bg-gray-800 dark:text-white',
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
