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

// Calculate price per ounce (1 oz = 29.5735 ml)
const calculatePricePerOunce = (price: number, bottleSize: BottleSize): number => {
  const ml = bottleSizeToMl[bottleSize];
  return (price / ml) * 29.5735;
};

export function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [open, setOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    bottle_size: '750ml' as BottleSize,
    link: '',
    image_url: '',
    type: '',
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
      setFormData({
        name: ingredient.name,
        price: ingredient.price?.toString() || '',
        bottle_size: ingredient.bottle_size,
        link: ingredient.link || '',
        image_url: ingredient.image_url || '',
        type: ingredient.type || '',
      });
    } else {
      setEditingIngredient(null);
      setFormData({
        name: '',
        price: '',
        bottle_size: '750ml',
        link: '',
        image_url: '',
        type: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIngredient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const price = formData.price ? parseFloat(formData.price) : null;
    const pricePerOunce = price ? calculatePricePerOunce(price, formData.bottle_size) : null;

    const ingredientData = {
      name: formData.name,
      price,
      bottle_size: formData.bottle_size,
      price_per_ounce: pricePerOunce,
      link: formData.link || null,
      image_url: formData.image_url || null,
      type: formData.type || null,
    };

    if (editingIngredient) {
      const { error } = await supabase
        .from('ingredients')
        .update(ingredientData)
        .eq('id', editingIngredient.id);

      if (error) {
        console.error('Error updating ingredient:', error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('ingredients')
        .insert([ingredientData]);

      if (error) {
        console.error('Error creating ingredient:', error);
        return;
      }
    }

    handleClose();
    fetchIngredients();
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
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
                  <MenuItem value="garnish">Garnish</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Bottle Size</InputLabel>
                <Select
                  value={formData.bottle_size}
                  label="Bottle Size"
                  onChange={(e) => setFormData({ ...formData, bottle_size: e.target.value as BottleSize })}
                >
                  <MenuItem value="50ml">50ml (Mini)</MenuItem>
                  <MenuItem value="200ml">200ml (Airplane)</MenuItem>
                  <MenuItem value="375ml">375ml (Half)</MenuItem>
                  <MenuItem value="500ml">500ml</MenuItem>
                  <MenuItem value="750ml">750ml (Standard)</MenuItem>
                  <MenuItem value="1L">1L</MenuItem>
                  <MenuItem value="1.75L">1.75L (Handle)</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                InputProps={{
                  startAdornment: <Typography>$</Typography>,
                }}
                fullWidth
              />
              {formData.price && formData.bottle_size && (
                <Typography variant="body2" color="text.secondary">
                  Price per ounce: ${calculatePricePerOunce(parseFloat(formData.price), formData.bottle_size).toFixed(2)}
                </Typography>
              )}
              <TextField
                label="Link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                fullWidth
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
    </Box>
  );
} 