import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Box, CircularProgress } from '@mui/material';
import { DEFAULT_BAR_SLUG } from '../constants/bars';
import { barPath } from '../utils/barPaths';
import { consumeRegistrationIntent } from '../utils/registrationIntent';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session) {
          const intent = consumeRegistrationIntent();

          const rpcPayload = {
            p_join_bar_slug: null as string | null,
            p_create_bar: false,
            p_bar_name: null as string | null,
            p_bar_slug: null as string | null,
          };

          if (intent?.type === 'owner') {
            rpcPayload.p_create_bar = true;
            rpcPayload.p_bar_name = intent.barName;
            rpcPayload.p_bar_slug = intent.barSlug;
          } else if (intent?.type === 'join') {
            rpcPayload.p_join_bar_slug = intent.barSlug;
          }

          const { data: rpcResult, error: rpcError } = await supabase.rpc(
            'complete_oauth_registration',
            rpcPayload
          );

          if (rpcError) {
            console.error('complete_oauth_registration:', rpcError);
          } else if (rpcResult && typeof rpcResult === 'object' && 'ok' in rpcResult) {
            const r = rpcResult as { ok?: boolean; error?: string; action?: string };
            if (r.ok === false && r.error) {
              console.warn('Registration RPC:', r.error, r);
            }
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('bar_id')
            .eq('id', session.user.id)
            .maybeSingle();

          let slug = DEFAULT_BAR_SLUG;
          if (profile?.bar_id) {
            const { data: bar } = await supabase
              .from('bars')
              .select('slug')
              .eq('id', profile.bar_id)
              .maybeSingle();
            if (bar?.slug) slug = bar.slug;
          }

          navigate(barPath(slug), { replace: true });
          return;
        }

        navigate('/login', { replace: true });
      } catch (error) {
        console.error('Error handling auth callback:', error);
        navigate('/login', { replace: true });
      }
    };

    void handleAuthCallback();
  }, [navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
