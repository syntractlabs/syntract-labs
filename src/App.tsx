import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, createBrowserRouter, type RouteObject } from "react-router";
import { RouterProvider } from "react-router/dom";
import AiroErrorBoundary from '../export-plugins/AiroErrorBoundary';
import CookieBannerErrorBoundary from '@/components/CookieBannerErrorBoundary';
import RootLayout from './layouts/RootLayout';
import Spinner from './components/Spinner';
import { routes } from './routes';
const CookieBanner = lazy(() => import('@/components/CookieBanner').catch(error => {
  console.warn('Failed to load CookieBanner:', error);
  return {
    default: () => null
  };
}));
const SpinnerFallback = () => <div className="flex justify-center py-8 h-screen items-center">
    <Spinner />
  </div>;
const rootElement = <Suspense fallback={<SpinnerFallback />}>
    <RootLayout>
      <Outlet />
    </RootLayout>
  </Suspense>;

// Wrap the agent-editable flat `routes` array in a layout route so ScrollRestoration
// + shared chrome live once above every page. Keeping the wrap here (instead of
// in routes.tsx) preserves the agent's simple flat-route contract. The dev
// boundary must live inside the route element so React Router doesn't replace it
// with its default route error UI before our boundary can catch render errors.
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
    </>;
}
