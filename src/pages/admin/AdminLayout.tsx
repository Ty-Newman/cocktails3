import { Outlet } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { AppBar } from '../../components/layout/AppBar';

export default function AdminLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar />
      <Container component="main" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Outlet />
      </Container>
    </Box>
  );
} 