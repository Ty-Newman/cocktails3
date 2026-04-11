import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  FormControlLabel,
  Snackbar,
  Switch,
  Typography,
} from '@mui/material';
import { getSupabaseClient } from '../../services/supabase';
import { useBar } from '../../contexts/BarContext';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Bar admins: toggle “open” and trigger patron emails (Supabase Edge Function + Resend).
 */
export function BarOpenToggle() {
  const { bar } = useBar();
  const { canAdminBar } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  const load = useCallback(async () => {
    if (!bar?.id || !canAdminBar(bar.id)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.from('bars').select('is_open').eq('id', bar.id).single();
      if (error) throw error;
      setIsOpen(Boolean(data?.is_open));
    } catch (e) {
      console.error(e);
      setSnackbar({
        open: true,
        severity: 'error',
        message: 'Could not load bar open status.',
      });
    } finally {
      setLoading(false);
    }
  }, [bar?.id, canAdminBar]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleChange = async (_: unknown, checked: boolean) => {
    if (!bar?.id) return;
    setBusy(true);
    const prev = isOpen;
    setIsOpen(checked);
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('notify-bar-open', {
        body: { bar_id: bar.id, is_open: checked },
      });

      if (error) throw error;

      const payload = data as {
        ok?: boolean;
        error?: string;
        emails_sent?: number;
        should_notify_email?: boolean;
        email_error?: string;
      };

      if (!payload?.ok) {
        throw new Error(payload?.error ?? 'Request failed');
      }

      if (payload.should_notify_email) {
        if (payload.email_error) {
          setSnackbar({
            open: true,
            severity: 'error',
            message: `Bar marked open; emails failed: ${payload.email_error}`,
          });
        } else {
          setSnackbar({
            open: true,
            severity: 'success',
            message: `Bar is open. Sent ${payload.emails_sent ?? 0} email(s) to patrons.`,
          });
        }
      } else {
        setSnackbar({
          open: true,
          severity: 'info',
          message: checked ? 'Bar marked open.' : 'Bar marked closed.',
        });
      }
    } catch (e) {
      console.error(e);
      setIsOpen(prev);
      setSnackbar({
        open: true,
        severity: 'error',
        message: e instanceof Error ? e.message : 'Could not update bar status.',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!bar?.id || !canAdminBar(bar.id)) {
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading bar status…
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }} icon={false}>
        <FormControlLabel
          control={
            <Switch
              checked={isOpen}
              onChange={(_, c) => void handleChange(_, c)}
              disabled={busy}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="subtitle2">Bar is open</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Turning on notifies patrons (email) who belong to this bar and have notifications
                enabled. Use your verified Resend domain in production.
              </Typography>
            </Box>
          }
          sx={{ m: 0, alignItems: 'flex-start' }}
        />
      </Alert>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
