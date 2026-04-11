import { useState, useEffect } from 'react';
import {
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Tooltip,
  Stack,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BlockIcon from '@mui/icons-material/Block';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { useBar } from '../../contexts/BarContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';

interface InviteRow {
  id: string;
  token: string;
  label: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function InvitesPage() {
  const { bar } = useBar();
  const { canAdminBar } = useAuth();
  const { supabase } = useSupabase();
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newExpires, setNewExpires] = useState('');
  const [lastCreatedUrl, setLastCreatedUrl] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  const load = async () => {
    if (!supabase || !bar?.id || !canAdminBar(bar.id)) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('bar_invite_links')
      .select('id, token, label, expires_at, revoked_at, created_at')
      .eq('bar_id', bar.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
      setRows([]);
    } else {
      setRows((data as InviteRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [bar?.id, supabase, canAdminBar]);

  const inviteUrl = (token: string) => `${window.location.origin}/join/${token}`;

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Could not copy', severity: 'error' });
    }
  };

  const handleCreate = async () => {
    if (!supabase || !bar?.id) return;
    const expiresAt =
      newExpires.trim() === ''
        ? null
        : new Date(newExpires).toISOString();
    if (newExpires.trim() !== '' && Number.isNaN(Date.parse(newExpires))) {
      setSnackbar({ open: true, message: 'Invalid expiry date', severity: 'error' });
      return;
    }
    const { data, error } = await supabase
      .from('bar_invite_links')
      .insert({
        bar_id: bar.id,
        label: newLabel.trim() || null,
        expires_at: expiresAt,
      })
      .select('token')
      .single();
    if (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
      return;
    }
    setLastCreatedUrl(inviteUrl((data as { token: string }).token));
    setCreateOpen(false);
    setNewLabel('');
    setNewExpires('');
    setSnackbar({ open: true, message: 'Invite link created', severity: 'success' });
    void load();
  };

  const handleRevoke = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('bar_invite_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
      return;
    }
    setSnackbar({ open: true, message: 'Link revoked', severity: 'success' });
    void load();
  };

  const maskToken = (t: string) => (t.length > 12 ? `${t.slice(0, 6)}…${t.slice(-4)}` : t);

  if (!canAdminBar(bar?.id)) {
    return (
      <Container sx={{ mt: 2 }}>
        <Typography color="text.secondary">You do not have access to manage invites for this bar.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 1, sm: 2 }, px: { xs: 1, sm: 2 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.35rem', sm: '2rem' } }}>
          Invite links
        </Typography>
        <Button variant="contained" startIcon={<AddLinkIcon />} onClick={() => setCreateOpen(true)}>
          New invite link
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Share a link like <code>/join/&lt;token&gt;</code>. Anyone who opens it and signs in joins this bar as a
        patron (and we set their home bar if they were still on the default bar).
      </Typography>

      {lastCreatedUrl && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => void copyText(lastCreatedUrl)}>
              Copy
            </Button>
          }
          onClose={() => setLastCreatedUrl(null)}
        >
          New link: <Typography component="span" variant="body2" sx={{ wordBreak: 'break-all' }}>{lastCreatedUrl}</Typography>
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Label</TableCell>
                <TableCell>Token</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>Loading…</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No invite links yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const expired =
                    r.expires_at != null && new Date(r.expires_at) < new Date();
                  const revoked = r.revoked_at != null;
                  const status = revoked ? 'Revoked' : expired ? 'Expired' : 'Active';
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.label ?? '—'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {maskToken(r.token)}
                        </Typography>
                      </TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell>{r.expires_at ? new Date(r.expires_at).toLocaleString() : '—'}</TableCell>
                      <TableCell>{status}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Copy full URL">
                          <IconButton
                            size="small"
                            onClick={() => void copyText(inviteUrl(r.token))}
                            disabled={revoked || expired}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Revoke">
                          <span>
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => void handleRevoke(r.id)}
                              disabled={revoked}
                            >
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New invite link</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Label (optional)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              fullWidth
              placeholder="e.g. Staff night, QR on table 4"
            />
            <TextField
              label="Expires (optional)"
              type="datetime-local"
              value={newExpires}
              onChange={(e) => setNewExpires(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleCreate()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
