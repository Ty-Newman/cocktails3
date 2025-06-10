import { Button, Stack, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { signInWithGoogle, signInWithDiscord } = useAuth();

  return (
    <Stack spacing={2} alignItems="center" sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to Cocktails
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Sign in to access your favorite cocktails and create your own recipes
      </Typography>
      
      <Button
        variant="contained"
        startIcon={<GoogleIcon />}
        onClick={signInWithGoogle}
        fullWidth
        sx={{ mt: 2 }}
      >
        Continue with Google
      </Button>
      
      <Button
        variant="contained"
        onClick={signInWithDiscord}
        fullWidth
        sx={{
          backgroundColor: '#5865F2',
          '&:hover': {
            backgroundColor: '#4752C4',
          },
        }}
      >
        Continue with Discord
      </Button>
    </Stack>
  );
} 