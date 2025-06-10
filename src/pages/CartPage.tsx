import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Divider,
  Paper,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';

export function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, totalCost } = useCart();
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [confirmDialog, setConfirmDialog] = useState(false);

  const handleClearCart = () => {
    clearCart();
    setConfirmDialog(false);
    setSnackbar({ 
      open: true, 
      message: 'Cart cleared successfully!' 
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (items.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Your Cart
        </Typography>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Your cart is empty
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/cocktails')}
            sx={{ mt: 2 }}
          >
            Browse Cocktails
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Your Cart
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {items.map((item) => (
            <Card key={item.id} sx={{ mb: 2 }}>
              <CardContent>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6">{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      ${item.price.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center">
                      <IconButton
                        size="small"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <RemoveIcon />
                      </IconButton>
                      <Typography sx={{ mx: 2 }}>{item.quantity}</Typography>
                      <IconButton
                        size="small"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <AddIcon />
                      </IconButton>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Box display="flex" justifyContent="flex-end">
                      <IconButton
                        color="error"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            <Box sx={{ my: 2 }}>
              <Typography variant="body1">
                Total Items: {items.reduce((sum, item) => sum + item.quantity, 0)}
              </Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                Total Cost: ${totalCost.toFixed(2)}
              </Typography>
            </Box>

            <Box sx={{ my: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body1" gutterBottom>
                In my house you never have to pay for your drinks, but if you want to contribute, donations are always welcome. The cost you see here is the cost of ingredients, but that doesn't mean you need to pay for it all - send as much or as little as you'd like!
              </Typography>
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Box
                  component="img"
                  src="/venmo-qr.jpg"
                  alt="Venmo QR Code"
                  sx={{
                    maxWidth: '200px',
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    margin: '0 auto',
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <Link 
                    href="https://venmo.com/code?user_id=2362012927524864585&created=1749533185" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    sx={{ 
                      display: 'inline-block',
                      mt: 1,
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Click here to pay with Venmo
                  </Link>
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              color="error"
              fullWidth
              size="large"
              onClick={() => setConfirmDialog(true)}
            >
              Clear Cart
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        aria-labelledby="clear-cart-dialog-title"
      >
        <DialogTitle id="clear-cart-dialog-title">
          Clear Cart?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to clear your cart? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleClearCart} color="error" variant="contained">
            Clear Cart
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
} 