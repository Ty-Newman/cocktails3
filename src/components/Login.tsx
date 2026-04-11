import { useState, useEffect } from 'react';
import {
  Button,
  Stack,
  Typography,
  TextField,
  Box,
  Alert,
  Link,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  persistRegistrationIntent,
  BAR_SLUG_PATTERN,
  normalizeBarSlugInput,
} from '../utils/registrationIntent';
import { defaultBarHome } from '../utils/barPaths';
import { peekBarInviteToken } from '../utils/barInviteToken';

export function Login() {
  const { signInWithGoogle, signInWithDiscord } = useAuth();
  const [searchParams] = useSearchParams();
  const intentOwner = searchParams.get('intent') === 'owner';
  const joinBarSlug = searchParams.get('bar')?.trim() || null;

  const [joinBarName, setJoinBarName] = useState<string | null>(null);
  const [ownerBarName, setOwnerBarName] = useState('');
  const [ownerBarSlug, setOwnerBarSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pendingBarInvite = !intentOwner && !!peekBarInviteToken();

  useEffect(() => {
    if (joinBarSlug && !intentOwner) {
      void supabase
        .from('bars')
        .select('name')
        .eq('slug', joinBarSlug)
        .maybeSingle()
        .then(({ data }) => {
          setJoinBarName(data?.name ?? null);
        });
    } else {
      setJoinBarName(null);
    }
  }, [joinBarSlug, intentOwner]);

  const prepareIntent = (): boolean => {
    setError(null);
    if (intentOwner) {
      const name = ownerBarName.trim();
      const slug = normalizeBarSlugInput(ownerBarSlug);
      if (!name) {
        setError('Enter a name for your bar.');
        return false;
      }
      if (!slug || slug.length < 2 || !BAR_SLUG_PATTERN.test(slug)) {
        setError(
          'URL slug must be 2–40 characters: lowercase letters, numbers, and hyphens only (e.g. my-home-bar).'
        );
        return false;
      }
      persistRegistrationIntent({ type: 'owner', barName: name, barSlug: slug });
      return true;
    }
    if (joinBarSlug) {
      persistRegistrationIntent({ type: 'join', barSlug: joinBarSlug });
    } else {
      persistRegistrationIntent({ type: 'default' });
    }
    return true;
  };

  const handleGoogle = async () => {
    if (!prepareIntent()) return;
    await signInWithGoogle();
  };

  const handleDiscord = async () => {
    if (!prepareIntent()) return;
    await signInWithDiscord();
  };

  return (
    <Stack spacing={2} alignItems="stretch" sx={{ maxWidth: 440, mx: 'auto', mt: 4, px: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        {intentOwner ? 'Register your bar' : 'Welcome'}
      </Typography>

      {intentOwner && (
        <>
          <Typography variant="body2" color="text.secondary" align="center">
            Create your bar space—free today. You can manage menus and settings as an admin for your
            venue.
          </Typography>
          <TextField
            label="Bar / venue name"
            value={ownerBarName}
            onChange={(e) => setOwnerBarName(e.target.value)}
            required
            fullWidth
            autoComplete="organization"
          />
          <TextField
            label="Your bar URL (slug)"
            value={ownerBarSlug}
            onChange={(e) => setOwnerBarSlug(normalizeBarSlugInput(e.target.value))}
            required
            fullWidth
            helperText={`Your site path will be ${window.location.origin}/your-slug`}
            autoComplete="off"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ px: 0.5 }}>
            Opening a bar is free by default. Paid plans may be offered later—you will never be
            charged without choosing to upgrade.
          </Typography>
        </>
      )}

      {pendingBarInvite && (
        <Alert severity="info">
          You opened a bar invite link. After you sign in, we will add you to that bar as a patron
          (and set it as your home bar if you are still on the default bar).
        </Alert>
      )}

      {!intentOwner && joinBarSlug && (
        <Alert severity="info">
          After you sign in, your account will be linked to{' '}
          <strong>{joinBarName ?? joinBarSlug}</strong>
          {joinBarName ? ` (${joinBarSlug})` : ''}. You can open your own bar later from your
          profile—optional and free by default.
        </Alert>
      )}

      {!intentOwner && !joinBarSlug && (
        <Typography variant="body1" color="text.secondary" align="center">
          Sign in to save favorites and use your cart. Browse the{' '}
          <Link component={RouterLink} to={defaultBarHome()}>
            default menu
          </Link>{' '}
          or{' '}
          <Link component={RouterLink} to="/register/bar-owner">
            register your own bar
          </Link>
          .
        </Typography>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        startIcon={<GoogleIcon />}
        onClick={() => void handleGoogle()}
        fullWidth
        sx={{ mt: 2 }}
      >
        Continue with Google
      </Button>

      <Button
        variant="contained"
        onClick={() => void handleDiscord()}
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

      <Box sx={{ textAlign: 'center', pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Want to run a venue?{' '}
          <Link component={RouterLink} to="/register/bar-owner">
            Bar owner registration
          </Link>
        </Typography>
        {joinBarSlug && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Not joining this bar?{' '}
            <Link component={RouterLink} to="/login">
              Sign in without linking
            </Link>
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
