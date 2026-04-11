import { Outlet } from 'react-router-dom';
import { Box, CircularProgress, Container, Link as MuiLink, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { BarProvider, useBar } from '../../contexts/BarContext';
import { CartProvider } from '../../contexts/CartContext';
import { FavoritesProvider } from '../../contexts/FavoritesContext';
import { AppBar } from './AppBar';
import { DEFAULT_BAR_SLUG } from '../../constants/bars';
import { barPath } from '../../utils/barPaths';

function TenantShell() {
  const { loading, error, bar } = useBar();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!bar) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="error" variant="h6" gutterBottom>
          {error || 'Bar not found'}
        </Typography>
        <Typography variant="body2">
          <MuiLink component={Link} to={barPath(DEFAULT_BAR_SLUG)}>
            Go to the default bar
          </MuiLink>
        </Typography>
      </Container>
    );
  }

  return (
    <CartProvider barId={bar.id}>
      <FavoritesProvider barId={bar.id}>
        <AppBar />
        <Container
          maxWidth={false}
          disableGutters
          sx={{ px: { xs: 1, sm: 2 }, py: { xs: 2, sm: 3 } }}
        >
          <Outlet />
        </Container>
      </FavoritesProvider>
    </CartProvider>
  );
}

export function TenantLayout() {
  return (
    <BarProvider>
      <TenantShell />
    </BarProvider>
  );
}
