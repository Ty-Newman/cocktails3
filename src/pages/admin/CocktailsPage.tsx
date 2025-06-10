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
  Autocomplete,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Container,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { supabase } from '../../services/supabase';
import type { Ingredient, IngredientType } from '../../types/supabase';

interface CocktailIngredient {
  id: string;
  amount: number;
  unit: string;
  ingredients: {
    id: string;
    name: string;
    price: number;
    type: string;
  };
}

interface Cocktail {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cocktail_ingredients: CocktailIngredient[];
  created_at: string;
  updated_at: string;
}

interface FormIngredient extends CocktailIngredient {
  ingredient: Ingredient;
}

// Add the bottle size to ml mapping
const bottleSizeToMl: Record<BottleSize, number> = {
  '50ml': 50,
  '200ml': 200,
  '375ml': 375,
  '500ml': 500,
  '750ml': 750,
  '1L': 1000,
  '1.75L': 1750
};

// Add the price calculation function
const calculatePricePerOunce = (price: number | null, bottleSize: BottleSize | null, type: IngredientType): number | null => {
  if (price === null || bottleSize === null) return null;
  
  if (type === 'bitters') {
    // Average bitters bottle has about 200 dashes
    const dashesPerBottle = 200;
    return price / dashesPerBottle;
  }
  
  const mlInBottle = bottleSizeToMl[bottleSize];
  const mlPerOunce = 29.5735; // 1 ounce = 29.5735 ml
  return (price * mlPerOunce) / mlInBottle;
};

// Add function to calculate cocktail cost
const calculateCocktailCost = (ingredients: CocktailIngredient[]): number => {
  if (!ingredients || ingredients.length === 0) return 0;

  return ingredients.reduce((total, ingredient) => {
    if (!ingredient.ingredients || !ingredient.amount) return total;

    const price = ingredient.ingredients.price;
    if (price === null) return total;

    const pricePerUnit = calculatePricePerOunce(
      price,
      ingredient.ingredients.bottle_size,
      ingredient.ingredients.type
    );

    // For items without bottle size (garnishes, non-bottled items)
    if (pricePerUnit === null) {
      return total + (price * ingredient.amount);
    }

    // For bottled items, calculate based on amount and unit
    const amount = ingredient.amount;
    const unit = ingredient.unit.toLowerCase();
    
    if (unit === 'dash' && ingredient.ingredients.type === 'bitters') {
      return total + (pricePerUnit * amount);
    } else if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') {
      return total + (pricePerUnit * amount);
    } else if (unit === 'ml') {
      // Convert ml to oz for calculation
      const mlPerOunce = 29.5735;
      return total + (pricePerUnit * (amount / mlPerOunce));
    }

    return total;
  }, 0);
};

export function CocktailsPage() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [open, setOpen] = useState(false);
  const [editingCocktail, setEditingCocktail] = useState<Cocktail | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    ingredients: [] as FormIngredient[],
  });
  const [error, setError] = useState<string | null>(null);

  // Load saved state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('cocktailsPageState');
    if (savedState) {
      const { open: savedOpen, editingCocktail: savedEditing, formData: savedFormData } = JSON.parse(savedState);
      if (savedOpen) {
        setOpen(savedOpen);
        setEditingCocktail(savedEditing);
        setFormData(savedFormData);
      }
    }
  }, []);

  // Save state to sessionStorage when it changes
  useEffect(() => {
    const stateToSave = {
      open,
      editingCocktail,
      formData
    };
    sessionStorage.setItem('cocktailsPageState', JSON.stringify(stateToSave));
  }, [open, editingCocktail, formData]);

  // Clear saved state when component unmounts
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('cocktailsPageState');
    };
  }, []);

  useEffect(() => {
    fetchCocktails();
    fetchIngredients();
  }, []);

  const fetchCocktails = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('cocktails')
        .select(`
          *,
          cocktail_ingredients (
            amount,
            unit,
            ingredients (
              id,
              name,
              price,
              bottle_size,
              type
            )
          )
        `)
        .order('name');

      if (error) throw error;
      setCocktails(data || []);
    } catch (error) {
      console.error('Error fetching cocktails:', error);
      setError(error instanceof Error ? error.message : 'Error fetching cocktails');
    }
  };

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

  const handleOpen = (cocktail?: Cocktail) => {
    if (cocktail) {
      setEditingCocktail(cocktail);
      setFormData({
        name: cocktail.name,
        description: cocktail.description || '',
        image_url: cocktail.image_url || '',
        ingredients: cocktail.cocktail_ingredients.map(ci => ({
          ...ci,
          ingredient: ingredients.find(i => i.id === ci.ingredients.id)!
        })),
      });
    } else {
      setEditingCocktail(null);
      setFormData({
        name: '',
        description: '',
        image_url: '',
        ingredients: [],
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCocktail(null);
  };

  const handleAddIngredient = (ingredient: Ingredient) => {
    setFormData(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          id: '',
          amount: 0,
          unit: 'oz',
          ingredients: {
            id: ingredient.id,
            name: ingredient.name,
            price: ingredient.price || 0,
            type: ingredient.type || 'other',
          },
          ingredient,
        }
      ]
    }));
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateIngredient = (index: number, field: keyof CocktailIngredient, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      const cocktailData = {
        name: formData.name,
        description: formData.description,
        image_url: formData.image_url || null
      };

      let cocktailId: number;

      if (editingCocktail) {
        // Update existing cocktail
        const { data, error } = await supabase
          .from('cocktails')
          .update(cocktailData)
          .eq('id', editingCocktail.id)
          .select()
          .single();

        if (error) throw error;
        cocktailId = editingCocktail.id;
      } else {
        // Create new cocktail
        const { data, error } = await supabase
          .from('cocktails')
          .insert([cocktailData])
          .select()
          .single();

        if (error) throw error;
        cocktailId = data.id;
      }

      // Delete existing ingredients if editing
      if (editingCocktail) {
        const { error: deleteError } = await supabase
          .from('cocktail_ingredients')
          .delete()
          .eq('cocktail_id', cocktailId);

        if (deleteError) throw deleteError;
      }

      // Insert new ingredients
      const ingredientInserts = formData.ingredients.map(ing => ({
        cocktail_id: cocktailId,
        ingredient_id: ing.ingredient.id,
        amount: ing.amount,
        unit: ing.unit
      }));

      const { error: insertError } = await supabase
        .from('cocktail_ingredients')
        .insert(ingredientInserts);

      if (insertError) throw insertError;

      handleClose();
      fetchCocktails();
    } catch (error) {
      console.error('Error saving cocktail:', error);
      setError(error instanceof Error ? error.message : 'Error saving cocktail');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this cocktail?')) {
      return;
    }

    const { error } = await supabase
      .from('cocktails')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cocktail:', error);
      return;
    }

    fetchCocktails();
  };

  // Group ingredients by type
  const groupedIngredients = ingredients.reduce((acc, ingredient) => {
    const type = ingredient.type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(ingredient);
    return acc;
  }, {} as Record<string, Ingredient[]>);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Cocktails
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Cocktail
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="cocktails table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Ingredients</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cocktails.map((cocktail) => (
                <TableRow key={cocktail.id}>
                  <TableCell>{cocktail.name}</TableCell>
                  <TableCell>
                    {cocktail.cocktail_ingredients?.map((ingredient, index) => (
                      <Typography key={index} variant="body2">
                        {ingredient.amount} {ingredient.unit} {ingredient.ingredients.name}
                        {index < (cocktail.cocktail_ingredients?.length || 0) - 1 ? ', ' : ''}
                      </Typography>
                    ))}
                  </TableCell>
                  <TableCell>
                    ${isNaN(calculateCocktailCost(cocktail.cocktail_ingredients || [])) 
                      ? '0.00' 
                      : calculateCocktailCost(cocktail.cocktail_ingredients || []).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleOpen(cocktail)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(cocktail.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingCocktail ? 'Edit Cocktail' : 'Add New Cocktail'}
          </DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
              <TextField
                label="Image URL"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                fullWidth
              />
              
              <Typography variant="h6" sx={{ mt: 2 }}>Ingredients</Typography>
              
              <Autocomplete
                options={ingredients}
                getOptionLabel={(option) => `${option.name} (${option.type})`}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Ingredients"
                    placeholder="Type to search..."
                  />
                )}
                renderOption={(props, option) => {
                  const pricePerUnit = calculatePricePerOunce(option.price, option.bottle_size, option.type);
                  const unitLabel = option.type === 'bitters' ? 'dash' : 'oz';
                  const priceDisplay = option.type === 'garnish' || (option.type === 'other' && !option.isBottled)
                    ? `$${option.price?.toFixed(2)}/unit`
                    : pricePerUnit !== null
                      ? `$${pricePerUnit.toFixed(2)}/${unitLabel}`
                      : `$${option.price?.toFixed(2)}/unit`;

                  return (
                    <li {...props}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Typography>{option.name}</Typography>
                        <Typography color="text.secondary">
                          {option.type} • {priceDisplay}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                onChange={(_, newValue) => {
                  if (newValue) {
                    handleAddIngredient(newValue);
                  }
                }}
                filterOptions={(options, { inputValue }) => {
                  const searchTerm = inputValue.toLowerCase();
                  return options.filter(option => 
                    option.name.toLowerCase().includes(searchTerm) ||
                    option.type.toLowerCase().includes(searchTerm)
                  );
                }}
                groupBy={(option) => option.type || 'other'}
              />

              <Typography variant="subtitle1" sx={{ mt: 2 }}>Selected Ingredients</Typography>
              {formData.ingredients.map((ing, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography sx={{ flex: 1 }}>{ing.ingredient.name}</Typography>
                  <TextField
                    type="number"
                    label="Amount"
                    value={ing.amount}
                    onChange={(e) => handleUpdateIngredient(index, 'amount', parseFloat(e.target.value))}
                    sx={{ width: 100 }}
                  />
                  <FormControl sx={{ width: 100 }}>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={ing.unit}
                      label="Unit"
                      onChange={(e) => handleUpdateIngredient(index, 'unit', e.target.value)}
                    >
                      <MenuItem value="oz">oz</MenuItem>
                      <MenuItem value="ml">ml</MenuItem>
                      <MenuItem value="dash">dash</MenuItem>
                      <MenuItem value="piece">piece</MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton onClick={() => handleRemoveIngredient(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
} 