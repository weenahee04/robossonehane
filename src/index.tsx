import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProvider } from './contexts/AuthContext';
import { BranchProvider } from './services/branchContext';
import { App } from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function AppProviders() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BranchProvider>
            <App />
          </BranchProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <AppProviders />
      </ClerkProvider>
    ) : (
      <AppProviders />
    )}
  </React.StrictMode>
);
