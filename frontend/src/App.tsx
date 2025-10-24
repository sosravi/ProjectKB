import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, Spinner, Center } from '@chakra-ui/react';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PkbPage } from './pages/PkbPage';
import { VersionTooltip } from './components/VersionTooltip';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="brand.500" />
      </Center>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage />
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
