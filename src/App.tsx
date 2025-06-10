import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Container, Button } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
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
  const { user, loading, signOut, isAdmin } = useAuth();

  console.log('AppContent render:', { user, loading, isAdmin });

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
            Cocktail App
          </Typography>
          <Button color="inherit" component={Link} to="/cocktails" sx={{ mr: 2 }}>
            All Cocktails
          </Button>
          {isAdmin && (
            <Button color="inherit" component={Link} to="/admin" sx={{ mr: 2 }}>
              Admin
            </Button>
          )}
          {user ? (
            <Button color="inherit" onClick={signOut}>
              Sign Out
            </Button>
          ) : (
            <Button color="inherit" component={Link} to="/login">
              Sign In
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Container>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/cocktails" element={<CocktailsList />} />
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
      <SupabaseProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </SupabaseProvider>
    </ThemeProvider>
  );
}

export default App;
