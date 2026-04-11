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
import { useBar } from '../../contexts/BarContext';
import { barPath } from '../../utils/barPaths';
import { DEFAULT_BAR_SLUG } from '../../constants/bars';

export function AppBar() {
  const { user, canAdminBar, signOut } = useAuth();
  const { bar } = useBar();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const slug = bar?.slug ?? DEFAULT_BAR_SLUG;
  const base = barPath(slug);
  const cocktailsPath = barPath(slug, 'cocktails');
  const cartPath = barPath(slug, 'cart');
  const profilePath = barPath(slug, 'profile');
  const adminCocktailsPath = barPath(slug, 'admin', 'cocktails');
  /** Sign in / register as a guest of this bar (not prompted to create a separate venue). */
  const loginAtThisBarPath = `/login?bar=${encodeURIComponent(slug)}`;

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
          to={base}
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {bar?.name ?? 'Cocktails'}
        </Typography>

        {isMobile ? (
          <>
            <IconButton
              color="inherit"
              component={RouterLink}
              to={cartPath}
              sx={{ mr: 1 }}
            >
              <Badge badgeContent={totalItems} color="error">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
            {user && (
              <IconButton
                color="inherit"
                component={RouterLink}
                to={profilePath}
                sx={{ mr: 1 }}
                aria-label="Profile"
              >
                <AccountCircleIcon />
              </IconButton>
            )}
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
                to={cocktailsPath}
                onClick={handleMobileMenuClose}
              >
                All Cocktails
              </MenuItem>
              {canAdminBar(bar?.id) && (
                <MenuItem
                  component={RouterLink}
                  to={adminCocktailsPath}
                  onClick={handleMobileMenuClose}
                >
                  Admin
                </MenuItem>
              )}
              {user ? (
                <>
                  <MenuItem
                    component={RouterLink}
                    to={profilePath}
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
                    to={loginAtThisBarPath}
                    onClick={handleMobileMenuClose}
                  >
                    Login
                  </MenuItem>
                  <MenuItem
                    component={RouterLink}
                    to={loginAtThisBarPath}
                    onClick={handleMobileMenuClose}
                  >
                    Register
                  </MenuItem>
                  <MenuItem
                    component={RouterLink}
                    to="/register/bar-owner"
                    onClick={handleMobileMenuClose}
                  >
                    Register your own bar
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
              to={cocktailsPath}
            >
              All Cocktails
            </Button>

            <IconButton
              color="inherit"
              component={RouterLink}
              to={cartPath}
              sx={{ ml: 1 }}
            >
              <Badge badgeContent={totalItems} color="error">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>

            {canAdminBar(bar?.id) && (
              <Button
                color="inherit"
                component={RouterLink}
                to={adminCocktailsPath}
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
                    to={profilePath}
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
                  to={loginAtThisBarPath}
                >
                  Login
                </Button>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to={loginAtThisBarPath}
                >
                  Register
                </Button>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/register/bar-owner"
                  size="small"
                >
                  Own a bar
                </Button>
              </>
            )}
          </Box>
        )}
      </Toolbar>
    </MuiAppBar>
  );
}
