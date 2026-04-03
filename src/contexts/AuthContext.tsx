import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react';
import type { AuthConfig, User } from '@/types';
import api from '@/services/api';
import { mockUser } from '@/services/mockData';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  config: AuthConfig;
}

interface AuthContextValue extends AuthState {
  login: (lineAccessToken: string) => Promise<void>;
  beginLineLogin: () => Promise<void>;
  loginDev: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USE_LOCAL_MOCK_ONLY = !import.meta.env.VITE_API_URL;
const USE_CLERK_AUTH = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const EMPTY_AUTH_CONFIG: AuthConfig = {
  devLoginEnabled: false,
  lineLoginEnabled: false,
  clerkEnabled: false,
  customerAuthMode: USE_LOCAL_MOCK_ONLY ? 'mock' : USE_CLERK_AUTH ? 'clerk' : 'legacy',
};

function mapMockUser(mu: typeof mockUser): User {
  return {
    id: mu.id,
    displayName: mu.displayName,
    avatarUrl: mu.avatarUrl,
    tier: 'gold',
    totalPoints: mu.points,
    totalWashes: mu.totalWashes,
    memberSince: mu.memberSince.toISOString(),
    createdAt: mu.memberSince.toISOString(),
  };
}

function createUnauthenticatedState(config: AuthConfig, error: string | null = null): AuthState {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error,
    config,
  };
}

function createMockState(): AuthState {
  return {
    user: mapMockUser(mockUser),
    isAuthenticated: true,
    isLoading: false,
    error: null,
    config: {
      devLoginEnabled: true,
      lineLoginEnabled: false,
      clerkEnabled: false,
      customerAuthMode: 'mock',
    },
  };
}

function useBaseAuthValue(
  state: AuthState,
  actions: Omit<AuthContextValue, keyof AuthState>
): AuthContextValue {
  return useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [state, actions]
  );
}

function LegacyAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    config: EMPTY_AUTH_CONFIG,
  });

  const resetToUnauthenticated = useCallback((config: AuthConfig, error: string | null = null) => {
    setState(createUnauthenticatedState(config, error));
  }, []);

  const initialize = useCallback(async () => {
    if (USE_LOCAL_MOCK_ONLY) {
      setState(createMockState());
      return;
    }

    api.setAuthFailureHandler(() => {
      resetToUnauthenticated(
        {
          devLoginEnabled: false,
          lineLoginEnabled: true,
          clerkEnabled: false,
          customerAuthMode: 'legacy',
        },
        null
      );
    });

    let config = EMPTY_AUTH_CONFIG;
    try {
      config = await api.getAuthConfig();
    } catch {
      config = {
        devLoginEnabled: false,
        lineLoginEnabled: true,
        clerkEnabled: false,
        customerAuthMode: 'legacy',
      };
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const lineState = url.searchParams.get('state');
    const lineError = url.searchParams.get('error');

    const clearLineCallbackParams = () => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('code');
      nextUrl.searchParams.delete('state');
      nextUrl.searchParams.delete('error');
      nextUrl.searchParams.delete('error_description');
      window.history.replaceState({}, document.title, `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    };

    const getLineRedirectUri = () => new URL('/', window.location.href).toString();
    const lineStateKey = 'roboss_line_login_state';

    if (lineError) {
      clearLineCallbackParams();
      setState(createUnauthenticatedState(config, 'LINE sign-in failed.'));
      return;
    }

    if (code) {
      const expectedState = sessionStorage.getItem(lineStateKey);
      sessionStorage.removeItem(lineStateKey);

      if (!lineState || !expectedState || lineState !== expectedState) {
        clearLineCallbackParams();
        setState(createUnauthenticatedState(config, 'LINE callback state is invalid.'));
        return;
      }

      try {
        const { user } = await api.loginWithLineCallback(code, getLineRedirectUri());
        clearLineCallbackParams();
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          config,
        });
        return;
      } catch {
        clearLineCallbackParams();
        setState(createUnauthenticatedState(config, 'Unable to complete LINE sign-in.'));
        return;
      }
    }

    if (!api.getToken() && !api.getRefreshToken()) {
      setState(createUnauthenticatedState(config, null));
      return;
    }

    try {
      const user = await api.restoreSession();
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        config,
      });
    } catch {
      api.clearToken();
      setState(createUnauthenticatedState(config, 'Session expired. Please sign in again.'));
    }
  }, [resetToUnauthenticated]);

  useEffect(() => {
    void initialize();
    return () => {
      api.setAuthFailureHandler(null);
    };
  }, [initialize]);

  const login = useCallback(async (lineAccessToken: string) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const { user } = await api.loginWithLine(lineAccessToken);
      setState((current) => ({
        ...current,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
    } catch {
      setState((current) => ({
        ...current,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Unable to sign in with LINE.',
      }));
      throw new Error('Login failed');
    }
  }, []);

  const beginLineLogin = useCallback(async () => {
    const stateValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('roboss_line_login_state', stateValue);

    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const redirectUri = new URL('/', window.location.href).toString();
      const url = await api.getLineLoginUrl(redirectUri, stateValue);
      window.location.assign(url);
    } catch {
      sessionStorage.removeItem('roboss_line_login_state');
      setState((current) => ({
        ...current,
        isLoading: false,
        error: 'Unable to start LINE sign-in.',
      }));
    }
  }, []);

  const loginDev = useCallback(async () => {
    if (USE_LOCAL_MOCK_ONLY) {
      setState(createMockState());
      return;
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const { user } = await api.loginDev();
      setState((current) => ({
        ...current,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
    } catch {
      setState((current) => ({
        ...current,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Dev login is not available.',
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (!USE_LOCAL_MOCK_ONLY) {
        await api.logout();
      }
    } finally {
      setState((current) => createUnauthenticatedState(current.config, null));
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (USE_LOCAL_MOCK_ONLY || !api.getToken()) {
      return;
    }

    try {
      const user = await api.getMe();
      setState((current) => ({ ...current, user }));
    } catch {
      setState((current) => createUnauthenticatedState(current.config, 'Session expired. Please sign in again.'));
    }
  }, []);

  const updateUser = useCallback((partial: Partial<User>) => {
    setState((current) =>
      current.user ? { ...current, user: { ...current.user, ...partial } } : current
    );
  }, []);

  const clearAuthError = useCallback(() => {
    setState((current) => ({ ...current, error: null }));
  }, []);

  const value = useBaseAuthValue(state, {
    login,
    beginLineLogin,
    loginDev,
    logout,
    refreshUser,
    updateUser,
    clearAuthError,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const {
    isLoaded: isClerkLoaded,
    isSignedIn: isClerkSignedIn,
    sessionId: clerkSessionId,
    getToken: getClerkToken,
  } = useClerkAuth();
  const clerk = useClerk();
  const { user: clerkUser } = useUser();
  const clerkUserId = clerkUser?.id ?? null;
  const exchangeKeyRef = useRef<string | null>(null);
  const baseConfig = useMemo<AuthConfig>(
    () => ({
      devLoginEnabled: false,
      lineLoginEnabled: true,
      clerkEnabled: true,
      customerAuthMode: 'clerk',
    }),
    []
  );
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    config: baseConfig,
  });

  useEffect(() => {
    api.setAuthFailureHandler(() => {
      api.clearToken();
      exchangeKeyRef.current = null;
      setState(createUnauthenticatedState(baseConfig, null));
    });

    return () => {
      api.setAuthFailureHandler(null);
    };
  }, [baseConfig]);

  useEffect(() => {
    let cancelled = false;

    const syncClerkSession = async () => {
      if (!isClerkLoaded) {
        setState((current) =>
          current.isLoading && current.config.customerAuthMode === 'clerk'
            ? current
            : { ...current, isLoading: true, error: null, config: baseConfig }
        );
        return;
      }

      if (!isClerkSignedIn || !clerkUserId) {
        api.clearToken();
        exchangeKeyRef.current = null;
        setState((current) =>
          !current.user &&
          !current.isAuthenticated &&
          !current.isLoading &&
          current.error === null &&
          current.config.customerAuthMode === 'clerk'
            ? current
            : createUnauthenticatedState(baseConfig, null)
        );
        return;
      }

      const exchangeKey = `${clerkUserId}:${clerkSessionId ?? 'no-session'}`;
      if (exchangeKeyRef.current === exchangeKey && api.getToken()) {
        setState((current) => ({
          ...current,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          config: baseConfig,
        }));
        return;
      }

      setState((current) => ({ ...current, isLoading: true, error: null, config: baseConfig }));

      try {
        const clerkToken = await getClerkToken();
        if (!clerkToken) {
          throw new Error('No Clerk session token available');
        }

        const { user } = await api.exchangeClerkSession(clerkToken);
        if (cancelled) {
          return;
        }

        exchangeKeyRef.current = exchangeKey;
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          config: baseConfig,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        api.clearToken();
        exchangeKeyRef.current = null;
        setState(
          createUnauthenticatedState(
            baseConfig,
            error instanceof Error && error.message
              ? error.message
              : 'Unable to exchange Clerk session with ROBOSS.'
          )
        );
      }
    };

    void syncClerkSession();

    return () => {
      cancelled = true;
    };
  }, [baseConfig, clerkSessionId, clerkUserId, getClerkToken, isClerkLoaded, isClerkSignedIn]);

  const login = useCallback(async () => {
    await clerk.redirectToSignIn({
      signInForceRedirectUrl: '/',
      signInFallbackRedirectUrl: '/',
      signUpForceRedirectUrl: '/',
      signUpFallbackRedirectUrl: '/',
    });
  }, [clerk]);

  const beginLineLogin = useCallback(async () => {
    await clerk.redirectToSignIn({
      signInForceRedirectUrl: '/',
      signInFallbackRedirectUrl: '/',
      signUpForceRedirectUrl: '/',
      signUpFallbackRedirectUrl: '/',
    });
  }, [clerk]);

  const loginDev = useCallback(async () => {
    setState((current) => ({
      ...current,
      error: 'Dev login is disabled when Clerk auth is enabled.',
      isLoading: false,
    }));
  }, []);

  const logout = useCallback(async () => {
    try {
      api.clearToken();
      exchangeKeyRef.current = null;
      await clerk.signOut({ redirectUrl: `${window.location.origin}/sign-in` });
    } finally {
      setState((current) => createUnauthenticatedState(current.config, null));
    }
  }, [clerk]);

  const refreshUser = useCallback(async () => {
    if (!api.getToken()) {
      return;
    }

    try {
      const user = await api.getMe();
      setState((current) => ({ ...current, user }));
    } catch {
      setState((current) => createUnauthenticatedState(current.config, 'Session expired. Please sign in again.'));
    }
  }, []);

  const updateUser = useCallback((partial: Partial<User>) => {
    setState((current) =>
      current.user ? { ...current, user: { ...current.user, ...partial } } : current
    );
  }, []);

  const clearAuthError = useCallback(() => {
    setState((current) => ({ ...current, error: null }));
  }, []);

  const value = useBaseAuthValue(state, {
    login,
    beginLineLogin,
    loginDev,
    logout,
    refreshUser,
    updateUser,
    clearAuthError,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (USE_LOCAL_MOCK_ONLY) {
    const mockValue = {
      ...createMockState(),
      login: async () => undefined,
      beginLineLogin: async () => undefined,
      loginDev: async () => undefined,
      logout: async () => undefined,
      refreshUser: async () => undefined,
      updateUser: () => undefined,
      clearAuthError: () => undefined,
    } satisfies AuthContextValue;

    return <AuthContext.Provider value={mockValue}>{children}</AuthContext.Provider>;
  }

  if (USE_CLERK_AUTH) {
    return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
  }

  return <LegacyAuthProvider>{children}</LegacyAuthProvider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
