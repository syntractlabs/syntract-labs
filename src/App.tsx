import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, createBrowserRouter, type RouteObject } from "react-router";
import { RouterProvider } from "react-router/dom";
import AiroErrorBoundary from '../export-plugins/ErrorBoundary';
import CookieBannerErrorBoundary from '@/components/CookieBannerErrorBoundary';
import RootLayout from './layouts/RootLayout';
import Spinner from './components/Spinner';
import { routes } from './routes';
import KlausWidget from '@/components/KlausWidget';

const CookieBanner = lazy(() => import('@/components/CookieBanner').catch(error => {
  console.warn('Failed to load CookieBanner:', error);
  return { default: () => null };
}));

const SpinnerFallback = () => <div className="flex justify-center py-8 h-screen items-center"><Spinner /></div>;

const rootElement = (
  <Suspense fallback={<SpinnerFallback />}>
    <RootLayout>
      <Outlet />
    </RootLayout>
  </Suspense>
);

const routeTree: RouteObject[] = [{
  element: import.meta.env.MODE === 'development' ? <AiroErrorBoundary>{rootElement}</AiroErrorBoundary> : rootElement,
  children: routes
}];

const router = createBrowserRouter(routeTree);

export default function App() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return <>
    <RouterProvider router={router} />
    {mounted && (
      <CookieBannerErrorBoundary>
        <Suspense fallback={null}>
          <CookieBanner />
        </Suspense>
      </CookieBannerErrorBoundary>
    )}
    {mounted && <KlausWidget />}
  </>;
}
