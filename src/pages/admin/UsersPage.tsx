import { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Alert,
  Snackbar,
  useMediaQuery,
  useTheme,
  Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useBar } from '../../contexts/BarContext';
import { useAuth } from '../../contexts/AuthContext';
import type { BarMemberRole } from '../../types/supabase';

interface User {
  user_id: string;
  role: BarMemberRole;
  created_at: string;
  profiles: {
    id: string;
    bar_id: string;
    created_at: string;
    updated_at: string;
  } | null;
}

interface FormData {
  role: BarMemberRole;
}

export function UsersPage() {
  const { bar } = useBar();
  const { canAdminBar } = useAuth();
  const { supabase } = useSupabase();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const [formData, setFormData] = useState<FormData>({
    role: 'patron'
  });

  useEffect(() => {
    void fetchUsers();
  }, [bar?.id]);

  const fetchUsers = async () => {
    if (!supabase) {
      console.error('Supabase client is not available');
      return;
    }

    try {
      console.log('Fetching users...');
      
      // Debug current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', { session, sessionError });

      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw sessionError;
      }

      if (!session) {
        console.error('No active session');
        setError('You must be logged in to view this page');
        return;
      }

      if (!canAdminBar(bar?.id)) {
        setError('You do not have admin access for this bar.');
        return;
      }

      const { data, error, status, statusText } = await supabase
        .from('bar_members')
        .select(`
          user_id,
          role,
          created_at,
          profiles ( id, bar_id, created_at, updated_at )
        `)
        .eq('bar_id', bar!.id)
        .order('created_at', { ascending: false });

      console.log('Response:', { data, error, status, statusText });

      if (error) {
        console.error('Error from Supabase:', error);
        throw error;
      }
      
      console.log('Users fetched:', data);
      setUsers((data as User[]) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Error fetching users');
    }
  };

  const handleOpen = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        role: 'patron'
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
    setFormData({
      role: 'patron'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      if (editingUser) {
        if (editingUser.role === 'owner' && formData.role !== 'owner') {
          throw new Error('Cannot change the venue owner role from this screen.');
        }
        const { error } = await supabase
          .from('bar_members')
          .update({ role: formData.role })
          .eq('bar_id', bar!.id)
          .eq('user_id', editingUser.user_id);

        if (error) throw error;
        setSnackbar({
          open: true,
          message: 'Member updated successfully',
          severity: 'success'
        });
      }

      handleClose();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error saving user',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!supabase) return;

    try {
      const member = users.find((u) => u.user_id === userId);
      if (member?.role === 'owner') {
        throw new Error('Cannot remove the venue owner.');
      }
      const { error } = await supabase
        .from('bar_members')
        .delete()
        .eq('bar_id', bar!.id)
        .eq('user_id', userId);

      if (error) throw error;
      setSnackbar({
        open: true,
        message: 'Member removed from this bar',
        severity: 'success'
      });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error deleting user',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        mt: { xs: 1, sm: 4 },
        mb: { xs: 2, sm: 4 },
        px: { xs: 0, sm: 2 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ mb: { xs: 0, sm: 1 }, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
        >
          Users
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => {
            console.log('Current user state:', { users, error });
            fetchUsers();
          }}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Debug Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {isMobile ? (
          <Box sx={{ p: 1 }}>
            {users.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 1 }}>
                No users found
              </Typography>
            ) : (
              <Stack spacing={1}>
                {users.map((user) => (
                  <Paper
                    key={user.user_id}
                    variant="outlined"
                    sx={{ p: 1.25, display: 'flex', gap: 1, alignItems: 'flex-start' }}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        User ID
                      </Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {user.user_id}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.75 }}>
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          Role:{' '}
                        </Box>
                        {user.role}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        Created: {new Date(user.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpen(user)}
                        color="primary"
                        aria-label="Edit"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(user.user_id)}
                        color="error"
                        aria-label="Delete"
                        disabled={user.role === 'owner'}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 440, overflowX: 'auto' }}>
            <Table stickyHeader aria-label="users table" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>User ID</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Member since</TableCell>
                  <TableCell>Profile updated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>{user.user_id}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {user.profiles?.updated_at
                          ? new Date(user.profiles.updated_at).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleOpen(user)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(user.user_id)}
                          color="error"
                          disabled={user.role === 'owner'}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Edit bar member</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Role"
              select
              fullWidth
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, role: e.target.value as BarMemberRole }))
              }
            >
              <MenuItem value="patron">Patron</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              {editingUser?.role === 'owner' ? (
                <MenuItem value="owner">Owner</MenuItem>
              ) : null}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={!editingUser}>
              Update
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
} 