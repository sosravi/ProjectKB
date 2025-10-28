import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, Spinner, Center } from '@chakra-ui/react';
import { useAuth } from './hooks/useAuth.ts';
import { Layout } from './components/Layout.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { SignupPage } from './pages/SignupPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { PkbPage } from './pages/PkbPage.tsx';
import { VersionTooltip } from './components/VersionTooltip.tsx';

function App() {
  const { isAuthenticated, isLoading, checkAuthState } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="brand.500" />
      </Center>
    );
  }

  const handleLoginSuccess = async () => {
    // Refresh authentication state after login
    if (checkAuthState) {
      await checkAuthState();
    }
  };

  const handleSignupSuccess = () => {
    // Handle signup success
  };

  const handleSwitchToSignup = () => {
    setShowSignup(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignup(false);
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : showSignup ? (
              <SignupPage 
                onSignupSuccess={handleSignupSuccess}
                onSwitchToLogin={handleSwitchToLogin}
              />
            ) : (
              <LoginPage 
                onLoginSuccess={handleLoginSuccess}
                onSwitchToSignup={handleSwitchToSignup}
              />
            )
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <SignupPage 
                onSignupSuccess={handleSignupSuccess}
                onSwitchToLogin={handleSwitchToLogin}
              />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Layout>
                <DashboardPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/pkb/:pkbId"
          element={
            isAuthenticated ? (
              <Layout>
                <PkbPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
          }
        />
      </Routes>
      
      {/* Version tooltip - subtle element for version display */}
      <VersionTooltip />
    </Box>
  );
}

export default App;
