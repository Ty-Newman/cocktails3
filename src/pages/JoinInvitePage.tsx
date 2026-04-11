import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Stack, Button } from '@mui/material';
import { persistBarInviteToken } from '../utils/barInviteToken';

/**
 * /join/:token — persist invite token and send the user to sign in.
 * Token is consumed in AuthCallback via accept_bar_invite RPC.
 */
export function JoinInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const raw = token?.trim();
    if (!raw || raw.length < 8) {
      navigate('/login', { replace: true });
      return;
    }
    persistBarInviteToken(raw);
  }, [token, navigate]);

  const handleContinue = () => {
    navigate('/login', { replace: true });
  };

  if (!token?.trim() || token.trim().length < 8) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        px: 2,
      }}
    >
      <Stack spacing={2} alignItems="center" sx={{ maxWidth: 420, textAlign: 'center' }}>
        <Typography variant="h5" component="h1">
          You&apos;re invited to a bar
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sign in or create an account to join. Your invite is saved for this browser until you finish
          signing in.
        </Typography>
        <Button variant="contained" size="large" onClick={handleContinue}>
          Continue to sign in
        </Button>
      </Stack>
    </Box>
  );
}
