import { RouteObject } from "react-router";
import { lazy } from 'react';
import HomePage from './pages/index';
import ProductPage from './pages/product';
import PricingPage from './pages/pricing';
import DocsPage from './pages/docs';
import SignupPage from './pages/signup';
import LoginPage from './pages/login';
import EnterprisePage from './pages/enterprise';
import DashboardPage from './pages/dashboard';
import TermsPage from './pages/terms';
import PrivacyPage from './pages/privacy';
import ForgotPasswordPage from './pages/forgot-password';
import ResetPasswordPage from './pages/reset-password';
import SettingsPage from './pages/settings';
import StatusPage from './pages/status';
import TutorialPage from './pages/tutorial';
import ContactPage from './pages/contact';
import VerifyEmailPage from './pages/verify-email';
import CartPage from './pages/cart';
import CheckoutSuccess from './pages/checkout/success';
import CheckoutCancel from './pages/checkout/cancel';
import SecurityPage from './pages/security';
import ProdNotFoundPage from './pages/_404';
const NotFoundPage = ProdNotFoundPage;
export const routes: RouteObject[] = [{
  path: '/',
  element: <HomePage />
}, {
  path: '/product',
  element: <ProductPage />
}, {
  path: '/pricing',
  element: <PricingPage />
}, {
  path: '/docs',
  element: <DocsPage />
}, {
  path: '/signup',
  element: <SignupPage />
}, {
  path: '/login',
  element: <LoginPage />
}, {
  path: '/enterprise',
  element: <EnterprisePage />
}, {
  path: '/dashboard',
  element: <DashboardPage />
}, {
  path: '/settings',
  element: <SettingsPage />
}, {
  path: '/forgot-password',
  element: <ForgotPasswordPage />
}, {
  path: '/reset-password',
  element: <ResetPasswordPage />
}, {
  path: '/terms',
  element: <TermsPage />
}, {
  path: '/privacy',
  element: <PrivacyPage />
}, {
  path: '/status',
  element: <StatusPage />
}, {
  path: '/tutorial',
  element: <TutorialPage />
}, {
  path: '/contact',
  element: <ContactPage />
}, {
  path: '/verify-email',
  element: <VerifyEmailPage />
}, {
  path: '/cart',
  element: <CartPage />
}, {
  path: '/checkout/success',
  element: <CheckoutSuccess />
}, {
  path: '/checkout/cancel',
  element: <CheckoutCancel />
}, {
  path: '/security',
  element: <SecurityPage />
}, {
  path: '*',
  element: <NotFoundPage />
}];
export type Path = '/' | '/product' | '/pricing' | '/docs' | '/signup' | '/login' | '/enterprise' | '/dashboard' | '/settings' | '/forgot-password' | '/reset-password' | '/terms' | '/privacy';
export type Params = Record<string, string | undefined>;
