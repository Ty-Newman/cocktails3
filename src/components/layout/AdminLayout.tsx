import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { barPath } from '../../utils/barPaths';
import {
  Box,
  Container,
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  LocalBar as CocktailIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  ShoppingCart as OrdersIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useState } from 'react';

const drawerWidth = 240;

export function AdminLayout() {
  const { barSlug } = useParams<{ barSlug: string }>();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const slug = barSlug ?? 'default';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: barPath(slug) },
    { text: 'Cocktails', icon: <CocktailIcon />, path: barPath(slug, 'admin', 'cocktails') },
    { text: 'Ingredients', icon: <InventoryIcon />, path: barPath(slug, 'admin', 'ingredients') },
    { text: 'Users', icon: <PeopleIcon />, path: barPath(slug, 'admin', 'users') },
    { text: 'Orders', icon: <OrdersIcon />, path: barPath(slug, 'admin', 'orders') }
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Admin Panel
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) {
                setMobileOpen(false);
              }
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Cocktail Management
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: '56px', sm: '64px' },
        }}
      >
        <Container
          maxWidth="lg"
          disableGutters={isMobile}
          sx={{
            px: { xs: 0, sm: 0 },
          }}
        >
          <Paper sx={{ p: { xs: 1.5, sm: 3 }, overflowX: 'hidden' }}>
            <Outlet />
          </Paper>
        </Container>
      </Box>
    </Box>
  );
} 