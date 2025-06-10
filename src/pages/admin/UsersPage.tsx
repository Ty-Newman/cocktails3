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
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface User {
  id: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

interface FormData {
  role: 'user' | 'admin';
}

export function UsersPage() {
  const { supabase } = useSupabase();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    role: 'user'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

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

      // First, check if we're actually an admin
      const { data: currentUser, error: userError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', session.user.id)
        .single();

      console.log('Current user check:', { currentUser, userError });

      if (userError) {
        console.error('Error checking current user:', userError);
        throw userError;
      }

      if (!currentUser || currentUser.role !== 'admin') {
        console.error('Current user is not an admin:', currentUser);
        setError('You must be an admin to view this page');
        return;
      }

      // Now fetch all users
      const { data, error, status, statusText } = await supabase
        .from('profiles')
        .select('id, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      console.log('Response:', { data, error, status, statusText });

      if (error) {
        console.error('Error from Supabase:', error);
        throw error;
      }
      
      console.log('Users fetched:', data);
      setUsers(data || []);
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
        role: 'user'
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
    setFormData({
      role: 'user'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      if (editingUser) {
        const { error } = await supabase
          .from('profiles')
          .update({
            role: formData.role,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        setSnackbar({
          open: true,
          message: 'User updated successfully',
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
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      setSnackbar({
        open: true,
        message: 'User deleted successfully',
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Users
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => {
            console.log('Current user state:', { users, error });
            fetchUsers();
          }}
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
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="users table">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
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
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(user.updated_at).toLocaleDateString()}
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
                        onClick={() => handleDelete(user.id)}
                        color="error"
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
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Add User'}
          </DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Role"
              select
              fullWidth
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'user' | 'admin' }))}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingUser ? 'Update' : 'Add'}
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