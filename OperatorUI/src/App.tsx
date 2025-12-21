// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import './telemetry';
import { Authenticated, Refine, ResourceProps } from '@refinedev/core';
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar';
import './style.scss';

import { ErrorComponent, ThemedLayoutContextProvider } from '@refinedev/antd';
import '@refinedev/antd/dist/reset.css';
import { App as AntdApp, ConfigProvider, Layout as AntdLayout } from 'antd';

import dataProvider, {
  GraphQLClient,
  graphqlWS,
  HasuraDataProviderOptions,
  HasuraLiveProviderOptions,
  liveProvider,
} from '@refinedev/hasura';
import routerBindings, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from '@refinedev/react-router-v6';

import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import React, { lazy, Suspense, useContext, useEffect, useMemo, useState } from 'react';
import { Header } from './components';
import {
  ColorModeContext,
  ColorModeContextProvider,
} from './contexts/color-mode';
// Import resources synchronously (needed for menu rendering)
import { resources as locationResources } from './pages/locations';
import { resources as chargingStationResources } from './pages/charging-stations';
import { resources as transactionResources } from './pages/transactions';
import { resources as authoriationResources } from './pages/authorizations';
import { resources as partnerResources } from './pages/partners';
import { resources as errorLogResources } from './pages/error-logs';
import { resources as analyticsResources } from './pages/analytics';
import { resources as revenueResources } from './pages/revenue';
import { resources as alertsResources } from './pages/alerts';
import { resources as settingsResources } from './pages/settings';

// Lazy load route components for code splitting
const OverviewRoutes = lazy(() =>
  import('./pages/overview').then((m) => ({ default: m.routes })),
);
const LocationsRoutes = lazy(() =>
  import('./pages/locations').then((m) => ({ default: m.routes })),
);
const ChargingStationsRoutes = lazy(() =>
  import('./pages/charging-stations').then((m) => ({ default: m.routes })),
);
const TransactionsRoutes = lazy(() =>
  import('./pages/transactions').then((m) => ({ default: m.routes })),
);
const AuthorizationsRoutes = lazy(() =>
  import('./pages/authorizations').then((m) => ({ default: m.routes })),
);
const PartnersRoutes = lazy(() =>
  import('./pages/partners').then((m) => ({ default: m.routes })),
);
const ErrorLogsRoutes = lazy(() =>
  import('./pages/error-logs').then((m) => ({ default: m.routes })),
);
const AnalyticsRoutes = lazy(() =>
  import('./pages/analytics').then((m) => ({ default: m.routes })),
);
const RevenueRoutes = lazy(() =>
  import('./pages/revenue').then((m) => ({ default: m.routes })),
);
const AlertsRoutes = lazy(() =>
  import('./pages/alerts').then((m) => ({ default: m.routes })),
);
const SettingsRoutes = lazy(() =>
  import('./pages/settings').then((m) => ({ default: m.routes })),
);
import { HelpPage } from './pages/help';
import { darkTheme, lightTheme } from './theme';
import { MainMenu, MenuSection } from './components/main-menu/main.menu';
import {
  checkTelemetryConsent,
  saveTelemetryConsent,
  TelemetryConsentModal,
} from '@util/TelemetryConsentModal';
import { initTelemetry } from './telemetry';
import AppModal from './AppModal';
import {
  createAccessProvider,
  createGenericAuthProvider,
  createKeycloakAuthProvider,
  HasuraHeader,
  ResourceType,
} from '@util/auth';
import { notificationProvider } from '@util/notificationProvider';
import { Spin } from 'antd';

import config from '@util/config';

// Loading fallback component for lazy-loaded routes
const RouteLoadingFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100%',
    }}
  >
    <Spin size="large" tip="Loading page..." />
  </div>
);

const KEYCLOAK_URL = config.keycloakUrl;
const KEYCLOAK_REALM = config.keycloakRealm;
export const authProvider =
  KEYCLOAK_URL && KEYCLOAK_REALM
    ? createKeycloakAuthProvider({
        keycloakUrl: KEYCLOAK_URL,
        keycloakRealm: KEYCLOAK_REALM,
      })
    : createGenericAuthProvider();

const accessControlProvider = createAccessProvider({
  getPermissions: authProvider.getPermissions!,
  getUserRole: authProvider.getUserRole!,
});

const requestMiddleware = async (request: any) => {
  const requestHeaders = {
    ...request.headers,
  };
  if (authProvider) {
    const token = await authProvider.getToken();
    if (token) {
      requestHeaders['Authorization'] = 'Bearer ' + token;
    }
    const hasuraHeaders = await authProvider.getHasuraHeaders();
    if (hasuraHeaders) {
      const hasuraRole = hasuraHeaders.get(HasuraHeader.X_HASURA_ROLE);
      if (hasuraRole) {
        requestHeaders[HasuraHeader.X_HASURA_ROLE] = hasuraRole;
      }
    }
  }
  return {
    ...request,
    headers: requestHeaders,
  };
};

const API_URL = config.apiUrl;
const WS_URL = config.wsUrl;

const client = new GraphQLClient(API_URL, {
  requestMiddleware,
});

const webSocketClient = graphqlWS.createClient({
  url: WS_URL,
  connectionParams: async () => {
    const token = await authProvider.getToken();
    if (token) {
      const hasuraHeaders = await authProvider.getHasuraHeaders();
      if (hasuraHeaders) {
        const hasuraRole = hasuraHeaders.get(HasuraHeader.X_HASURA_ROLE);
        if (hasuraRole)
          // If a role is set, include it in the connection params
          return {
            headers: {
              Authorization: `Bearer ${token}`,
              [HasuraHeader.X_HASURA_ROLE]: hasuraRole,
            },
          };
      }
      return {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
    }
  },
});

const hasuraProviderOptions = {
  idType: (resource: string) => {
    if (resource === ResourceType.CHARGING_STATIONS) return 'String';
    return 'Int';
  },
  namingConvention: 'hasura-default',
};

const hasuraDataProvider = dataProvider(
  client,
  hasuraProviderOptions as HasuraDataProviderOptions,
);

hasuraDataProvider.getApiUrl = () => {
  return API_URL;
};

interface MainAntdAppProps {
  isModalVisible: boolean;
  handleModalDecision: (agreed: boolean) => void;
}

const resources: ResourceProps[] = [
  ...chargingStationResources,
  ...locationResources,
  ...transactionResources,
  ...authoriationResources,
  ...partnerResources,
  ...errorLogResources,
  ...analyticsResources,
  ...revenueResources,
  ...alertsResources,
  ...settingsResources,
];

const MainAntDApp: React.FC<MainAntdAppProps> = ({
  isModalVisible,
  handleModalDecision,
}: MainAntdAppProps) => {
  const { mode } = useContext(ColorModeContext);
  const location = useLocation();

  const routeClassName = useMemo(() => {
    return `content-${location.pathname.replace(/\//g, '-').replace(/^-/, '')}`;
  }, [location.pathname]);

  const activeSection: MenuSection = useMemo(() => {
    if (location.pathname.startsWith(`/${MenuSection.LOCATIONS}`))
      return MenuSection.LOCATIONS;
    if (location.pathname.startsWith(`/${MenuSection.CHARGING_STATIONS}`))
      return MenuSection.CHARGING_STATIONS;
    if (location.pathname.startsWith(`/${MenuSection.AUTHORIZATIONS}`))
      return MenuSection.AUTHORIZATIONS;
    if (location.pathname.startsWith(`/${MenuSection.TRANSACTIONS}`))
      return MenuSection.TRANSACTIONS;
    if (location.pathname.startsWith(`/${MenuSection.ERROR_LOGS}`))
      return MenuSection.ERROR_LOGS;
    if (location.pathname.startsWith(`/${MenuSection.PARTNERS}`))
      return MenuSection.PARTNERS;
    if (location.pathname.startsWith(`/${MenuSection.ANALYTICS}`))
      return MenuSection.ANALYTICS;
    if (location.pathname.startsWith(`/${MenuSection.REVENUE}`))
      return MenuSection.REVENUE;
    if (location.pathname.startsWith(`/${MenuSection.ALERTS}`))
      return MenuSection.ALERTS;
    return MenuSection.OVERVIEW;
  }, [location.pathname]);

  const tabTitleHandler = () => {
    return config.appName;
  };

  const LoginPage = authProvider.getLoginPage();

  return (
    <AntdApp>
      <ConfigProvider theme={mode === 'light' ? lightTheme : darkTheme}>
        <TelemetryConsentModal
          visible={isModalVisible}
          onDecision={handleModalDecision}
        />

        <Refine
          authProvider={authProvider}
          accessControlProvider={accessControlProvider}
          dataProvider={hasuraDataProvider}
          liveProvider={liveProvider(
            webSocketClient,
            hasuraProviderOptions as HasuraLiveProviderOptions,
          )}
          notificationProvider={notificationProvider}
          routerProvider={routerBindings}
          resources={resources}
          options={{
            syncWithLocation: false,
            warnWhenUnsavedChanges: true,
            useNewQueryKeys: true,
            projectId: '6ZV3T4-Lyy7B3-Dr5Uhd',
            liveMode: 'auto',
          }}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <Authenticated key="login">
                  <div style={{ position: 'relative' }}>
                    <ThemedLayoutContextProvider initialSiderCollapsed={true}>
                      <AntdLayout
                        style={{ minHeight: '100vh' }}
                        hasSider={true}
                      >
                        <MainMenu activeSection={activeSection} />
                        <AntdLayout>
                          <Header activeSection={activeSection} />
                          <AppModal />
                          <AntdLayout.Content
                            className={`content-container ${routeClassName}`}
                          >
                            <div className="content-outer-wrap">
                              <div className="content-inner-wrap">
                                <Outlet />
                              </div>
                            </div>
                          </AntdLayout.Content>
                        </AntdLayout>
                      </AntdLayout>
                    </ThemedLayoutContextProvider>
                    <div
                      className={`gradient ${mode === 'dark' ? 'dark' : ''}`}
                    />
                  </div>
                </Authenticated>
              }
            >
              <Route path="/" element={<Navigate to="/overview" replace />} />

              {/* Lazy-loaded routes wrapped in Suspense for code splitting */}
              <Route
                index
                path="/overview/*"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <OverviewRoutes />
                  </Suspense>
                }
              />
              <Route
                path="/locations/*"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <LocationsRoutes />
                  </Suspense>
                }
              />
              <Route
                path="/authorizations/*"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <AuthorizationsRoutes />
                  </Suspense>
                }
              />
              <Route
                path="/transactions/*"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <TransactionsRoutes />
                  </Suspense>
                }
              />
              <Route
                path="/charging-stations/*"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <ChargingStationsRoutes />
                  </Suspense>
                }
              />
              <Route
                path="/partners/*"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <PartnersRoutes />
                  </Suspense>
                }
              />
              <Route
                path="/error-logs/*"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <ErrorLogsRoutes />
                  </Suspense>
                }
              />
              <Route
                path="/analytics/*"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <AnalyticsRoutes />
                  </Suspense>
                }
              />
              <Route
                path="/revenue/*"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <RevenueRoutes />
                  </Suspense>
                }
              />
              <Route
                path="/alerts/*"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <AlertsRoutes />
                  </Suspense>
                }
              />
              <Route
                path="/settings/*"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <SettingsRoutes />
                  </Suspense>
                }
              />

              {/* Non-lazy routes */}
              <Route path="/help" element={<HelpPage />} />
              <Route path="*" element={<ErrorComponent />} />
            </Route>
          </Routes>

          <RefineKbar />
          <UnsavedChangesNotifier />
          <DocumentTitleHandler handler={tabTitleHandler} />
        </Refine>
      </ConfigProvider>
    </AntdApp>
  );
};

export default function App() {
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const telemetryConsentModalInitialization = async () => {
      // On app start, try to read an existing consent
      const existingConsent = await checkTelemetryConsent();
      if (existingConsent == null) {
        // No consent found => show modal
        setIsModalVisible(true);
      } else {
        if (existingConsent) {
          initTelemetry();
        }
      }
    };
    telemetryConsentModalInitialization();
  }, []);

  /**
   * Handle user’s choice:
   */
  const handleModalDecision = (agreed: boolean) => {
    saveTelemetryConsent(agreed);
    setIsModalVisible(false);
    if (agreed) {
      initTelemetry();
    }
  };

  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <MainAntDApp
            isModalVisible={isModalVisible}
            handleModalDecision={handleModalDecision}
          />
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}
