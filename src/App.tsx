import { ThemeProvider, createTheme, CssBaseline, Container } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { AuthCallback } from './pages/AuthCallback';
import { AdminRoute } from './components/AdminRoute';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { IngredientsPage } from './pages/admin/IngredientsPage';
import { HomePage } from './pages/HomePage';
import { CocktailsList } from './pages/CocktailsList';
import { CocktailsPage } from './pages/admin/CocktailsPage';
import { OrdersPage } from './pages/admin/OrdersPage';
import { UsersPage } from './pages/admin/UsersPage';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { CartPage } from './pages/CartPage';
import { ProfilePage } from './pages/ProfilePage';
import { AppBar } from './components/layout/AppBar';

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

function AppContent() {
  const { user, loading, isAdmin } = useAuth();

  console.log('AppContent render:', { user, loading, isAdmin });

  return (
    <>
      <AppBar />
      <Container>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/cocktails" element={<CocktailsList />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="/admin/ingredients" replace />} />
            <Route path="ingredients" element={<IngredientsPage />} />
            <Route path="cocktails" element={<CocktailsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Routes>
      </Container>
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SupabaseProvider>
          <CartProvider>
            <FavoritesProvider>
              <Router>
                <AppContent />
              </Router>
            </FavoritesProvider>
          </CartProvider>
        </SupabaseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
