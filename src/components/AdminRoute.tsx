import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBar } from '../contexts/BarContext';
import { Box, CircularProgress } from '@mui/material';
import { DEFAULT_BAR_SLUG } from '../constants/bars';
import { barPath } from '../utils/barPaths';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { canAdminBar, loading, homeBarSlug } = useAuth();
  const { bar } = useBar();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!canAdminBar(bar?.id)) {
    const slug = bar?.slug ?? homeBarSlug ?? DEFAULT_BAR_SLUG;
    return <Navigate to={barPath(slug)} replace />;
  }

  return <>{children}</>;
}
