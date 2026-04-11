import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { AuthCallback } from './pages/AuthCallback';
import { AdminRoute } from './components/AdminRoute';
import { IngredientsPage } from './pages/admin/IngredientsPage';
import { HomePage } from './pages/HomePage';
import { CocktailsList } from './pages/CocktailsList';
import { CocktailsPage } from './pages/admin/CocktailsPage';
import { OrdersPage } from './pages/admin/OrdersPage';
import { UsersPage } from './pages/admin/UsersPage';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { CartPage } from './pages/CartPage';
import { ProfilePage } from './pages/ProfilePage';
import { TenantLayout } from './components/layout/TenantLayout';
import { DEFAULT_BAR_SLUG } from './constants/bars';
import { barPath, defaultBarHome } from './utils/barPaths';
import { JoinInvitePage } from './pages/JoinInvitePage';
import { InvitesPage } from './pages/admin/InvitesPage';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff4081',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function LoginRoute() {
  const { user, loading, homeBarSlug } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (user) {
    return <Navigate to={barPath(homeBarSlug ?? DEFAULT_BAR_SLUG)} replace />;
  }

  return <Login />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/register/bar-owner"
        element={<Navigate to="/login?intent=owner" replace />}
      />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/join/:token" element={<JoinInvitePage />} />
      <Route path="/" element={<Navigate to={defaultBarHome()} replace />} />
      <Route path="/:barSlug" element={<TenantLayout />}>
        <Route index element={<HomePage />} />
        <Route path="cocktails" element={<CocktailsList />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="ingredients" replace />} />
          <Route path="ingredients" element={<IngredientsPage />} />
          <Route path="cocktails" element={<CocktailsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="invites" element={<InvitesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SupabaseProvider>
          <Router>
            <AppRoutes />
          </Router>
        </SupabaseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
