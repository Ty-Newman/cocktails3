import { useState } from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Badge,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

export function AppBar() {
  const { user, isAdmin, signOut } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
  };

  const handleSignOut = async () => {
    handleClose();
    await signOut();
    navigate('/login');
  };

  return (
    <MuiAppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Cocktails
        </Typography>

        {isMobile ? (
          <>
            <IconButton
              color="inherit"
              component={RouterLink}
              to="/cart"
              sx={{ mr: 1 }}
            >
              <Badge badgeContent={totalItems} color="error">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
            <IconButton
              edge="end"
              color="inherit"
              aria-label="menu"
              onClick={handleMobileMenu}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={mobileMenuAnchorEl}
              open={Boolean(mobileMenuAnchorEl)}
              onClose={handleMobileMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem 
                component={RouterLink} 
                to="/cocktails"
                onClick={handleMobileMenuClose}
              >
                All Cocktails
              </MenuItem>
              {isAdmin && (
                <MenuItem 
                  component={RouterLink} 
                  to="/admin/cocktails"
                  onClick={handleMobileMenuClose}
                >
                  Admin
                </MenuItem>
              )}
              {user ? (
                <>
                  <MenuItem 
                    component={RouterLink} 
                    to="/profile"
                    onClick={handleMobileMenuClose}
                  >
                    Profile
                  </MenuItem>
                  <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
                </>
              ) : (
                <>
                  <MenuItem 
                    component={RouterLink} 
                    to="/login"
                    onClick={handleMobileMenuClose}
                  >
                    Login
                  </MenuItem>
                  <MenuItem 
                    component={RouterLink} 
                    to="/login"
                    onClick={handleMobileMenuClose}
                  >
                    Register
                  </MenuItem>
                </>
              )}
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              color="inherit"
              component={RouterLink}
              to="/cocktails"
            >
              All Cocktails
            </Button>

            <IconButton
              color="inherit"
              component={RouterLink}
              to="/cart"
              sx={{ ml: 1 }}
            >
              <Badge badgeContent={totalItems} color="error">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>

            {isAdmin && (
              <Button
                color="inherit"
                component={RouterLink}
                to="/admin/cocktails"
              >
                Admin
              </Button>
            )}

            {user ? (
              <>
                <IconButton
                  size="large"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                  color="inherit"
                >
                  <AccountCircleIcon />
                </IconButton>
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem 
                    component={RouterLink} 
                    to="/profile"
                    onClick={handleClose}
                  >
                    Profile
                  </MenuItem>
                  <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/login"
                >
                  Login
                </Button>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/login"
                >
                  Register
                </Button>
              </>
            )}
          </Box>
        )}
      </Toolbar>
    </MuiAppBar>
  );
} 