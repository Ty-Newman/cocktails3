import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { supabase } from '../../services/supabase';
import type { IngredientType, BottleSize } from '../../types/supabase';

interface Ingredient {
  id: string;
  name: string;
  price: number | null;
  bottle_size: BottleSize;
  price_per_ounce: number | null;
  link: string | null;
  image_url: string | null;
  type: IngredientType | null;
}

interface FormData {
  name: string;
  type: IngredientType | null;
  price: string;
  bottle_size: BottleSize | null;
  link: string;
  isBottled: boolean;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

// Bottle size to ml conversion
const bottleSizeToMl: Record<BottleSize, number> = {
  '50ml': 50,
  '200ml': 200,
  '375ml': 375,
  '500ml': 500,
  '750ml': 750,
  '1L': 1000,
  '1.75L': 1750
};

// Calculate price per unit (1 oz = 29.5735 ml)
const calculatePricePerUnit = (price: number, bottleSize: BottleSize, type: IngredientType): number => {
  const mlInBottle = bottleSizeToMl[bottleSize];
  const mlPerOunce = 29.5735; // 1 ounce = 29.5735 ml
  
  if (type === 'bitters') {
    // Average bitters bottle has about 200 dashes
    const dashesPerBottle = 200;
    return price / dashesPerBottle;
  }
  
  return (price * mlPerOunce) / mlInBottle;
};

const ingredientTypeOptions = [
  { value: 'spirit', label: 'Spirit' },
  { value: 'liqueur', label: 'Liqueur' },
  { value: 'syrup', label: 'Syrup' },
  { value: 'bitters', label: 'Bitters' },
  { value: 'juice', label: 'Juice' },
  { value: 'other', label: 'Other' }
];

export function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [open, setOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'spirit',
    price: 0,
    bottle_size: '750ml',
    link: '',
    isBottled: true
  });

  // Load saved state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('ingredientsPageState');
    if (savedState) {
      const { open: savedOpen, editingIngredient: savedEditing, formData: savedFormData } = JSON.parse(savedState);
      if (savedOpen) {
        setOpen(savedOpen);
        setEditingIngredient(savedEditing);
        setFormData(savedFormData);
      }
    }
  }, []);

  // Save state to sessionStorage when it changes
  useEffect(() => {
    const stateToSave = {
      open,
      editingIngredient,
      formData
    };
    sessionStorage.setItem('ingredientsPageState', JSON.stringify(stateToSave));
  }, [open, editingIngredient, formData]);

  // Clear saved state when component unmounts
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('ingredientsPageState');
    };
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching ingredients:', error);
      return;
    }

    setIngredients(data || []);
  };

  const handleOpen = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      // Calculate total price from price_per_ounce for display
      const totalPrice = ingredient.price;
      setFormData({
        name: ingredient.name,
        type: ingredient.type,
        price: totalPrice,
        bottle_size: ingredient.bottle_size,
        link: ingredient.link || '',
        isBottled: ingredient.type === 'juice' || ingredient.type === 'other' ? ingredient.bottle_size !== null : true
      });
    } else {
      setEditingIngredient(null);
      setFormData({
        name: '',
        type: 'spirit',
        price: 0,
        bottle_size: '750ml',
        link: '',
        isBottled: true
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIngredient(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name === 'type') {
      if (value === 'bitters') {
        setFormData(prev => ({
          ...prev,
          [name as string]: value,
          bottle_size: '200ml',
          isBottled: true
        }));
      } else if (value === 'garnish') {
        setFormData(prev => ({
          ...prev,
          [name as string]: value,
          bottle_size: null,
          price: '',
          isBottled: false
        }));
      } else if (value === 'other' || value === 'juice') {
        setFormData(prev => ({
          ...prev,
          [name as string]: value,
          bottle_size: prev.isBottled ? prev.bottle_size : null,
          price: ''
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name as string]: value,
          isBottled: true
        }));
      }
    } else if (name === 'isBottled') {
      const isChecked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        isBottled: isChecked,
        bottle_size: isChecked ? prev.bottle_size : null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name as string]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      const ingredientData = {
        name: formData.name,
        type: formData.type,
        price: formData.price,
        bottle_size: (formData.type === 'juice' || formData.type === 'other') && !formData.isBottled ? null : formData.bottle_size,
        link: formData.link || null
      };

      if (editingIngredient) {
        const { error } = await supabase
          .from('ingredients')
          .update(ingredientData)
          .eq('id', editingIngredient.id);

        if (error) throw error;
        setSnackbar({ open: true, message: 'Ingredient updated successfully', severity: 'success' });
      } else {
        const { error } = await supabase
          .from('ingredients')
          .insert([ingredientData]);

        if (error) throw error;
        setSnackbar({ open: true, message: 'Ingredient added successfully', severity: 'success' });
      }

      handleClose();
      fetchIngredients();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      setError(error instanceof Error ? error.message : 'Error saving ingredient');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this ingredient?')) {
      return;
    }

    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ingredient:', error);
      return;
    }

    fetchIngredients();
  };

  const truncateLink = (link: string | null) => {
    if (!link) return '';
    try {
      const url = new URL(link);
      return url.hostname + (url.pathname.length > 20 ? '...' : url.pathname);
    } catch {
      return link.length > 30 ? link.substring(0, 30) + '...' : link;
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Manage Ingredients</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Ingredient
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Link</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ingredients.map((ingredient) => (
              <TableRow key={ingredient.id}>
                <TableCell>{ingredient.name}</TableCell>
                <TableCell>{ingredient.type}</TableCell>
                <TableCell>${ingredient.price?.toFixed(2)}</TableCell>
                <TableCell>
                  {ingredient.link && (
                    <a 
                      href={ingredient.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      title={ingredient.link}
                    >
                      {truncateLink(ingredient.link)}
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(ingredient)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(ingredient.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingIngredient ? 'Edit Ingredient' : 'Add New Ingredient'}
          </DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                required
                name="name"
                label="Name"
                value={formData.name}
                onChange={handleChange}
              />
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as IngredientType })}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="whiskey">Whiskey</MenuItem>
                  <MenuItem value="vodka">Vodka</MenuItem>
                  <MenuItem value="rum">Rum</MenuItem>
                  <MenuItem value="gin">Gin</MenuItem>
                  <MenuItem value="tequila">Tequila</MenuItem>
                  <MenuItem value="brandy">Brandy</MenuItem>
                  <MenuItem value="liqueur">Liqueur</MenuItem>
                  <MenuItem value="wine">Wine</MenuItem>
                  <MenuItem value="beer">Beer</MenuItem>
                  <MenuItem value="mixer">Mixer</MenuItem>
                  <MenuItem value="syrup">Syrup</MenuItem>
                  <MenuItem value="bitters">Bitters</MenuItem>
                  <MenuItem value="juice">Juice</MenuItem>
                  <MenuItem value="garnish">Garnish</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              {(formData.type === 'other' || formData.type === 'juice') && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isBottled}
                      onChange={handleChange}
                      name="isBottled"
                    />
                  }
                  label="This is a bottled ingredient"
                />
              )}
              {formData.type === 'garnish' || 
               (formData.type === 'other' && !formData.isBottled) ||
               (formData.type === 'juice' && !formData.isBottled) ? (
                <TextField
                  fullWidth
                  required
                  name="price"
                  label="Price per Unit"
                  type="number"
                  value={formData.price}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText={formData.type === 'garnish' 
                    ? "Enter the price per individual garnish (e.g., per lime, per orange slice)"
                    : formData.type === 'juice'
                    ? "Enter the price per individual juice (e.g., per lemon, per lime)"
                    : "Enter the price per individual unit"}
                />
              ) : (
                <TextField
                  fullWidth
                  required
                  name="price"
                  label="Price"
                  type="number"
                  value={formData.price}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText={formData.price && formData.bottle_size ? 
                    `Price per ${formData.type === 'bitters' ? 'dash' : 'ounce'}: $${calculatePricePerUnit(
                      formData.price,
                      formData.bottle_size,
                      formData.type
                    ).toFixed(2)}` : ''}
                />
              )}
              {formData.type !== 'bitters' && formData.type !== 'garnish' && 
               (formData.type !== 'other' || formData.isBottled) &&
               (formData.type !== 'juice' || formData.isBottled) && (
                <FormControl fullWidth required>
                  <InputLabel>Bottle Size</InputLabel>
                  <Select
                    name="bottle_size"
                    value={formData.bottle_size}
                    onChange={handleChange}
                    label="Bottle Size"
                  >
                    <MenuItem value="50ml">50ml</MenuItem>
                    <MenuItem value="200ml">200ml</MenuItem>
                    <MenuItem value="375ml">375ml</MenuItem>
                    <MenuItem value="500ml">500ml</MenuItem>
                    <MenuItem value="750ml">750ml</MenuItem>
                    <MenuItem value="1L">1L</MenuItem>
                    <MenuItem value="1.75L">1.75L</MenuItem>
                  </Select>
                </FormControl>
              )}
              <TextField
                fullWidth
                name="link"
                label="Link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                helperText="Optional link to purchase the ingredient"
              />
              <TextField
                label="Image URL"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
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
    </Box>
  );
} 