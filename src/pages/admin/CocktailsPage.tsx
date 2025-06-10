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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { supabase } from '../../services/supabase';
import type { Ingredient, IngredientType } from '../../types/supabase';

interface CocktailIngredient {
  ingredient_id: string;
  amount: number;
  unit: string;
}

interface Cocktail {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  ingredients: CocktailIngredient[];
  created_at: string;
  updated_at: string;
}

interface FormIngredient extends CocktailIngredient {
  ingredient: Ingredient;
}

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
    const { data, error } = await supabase
      .from('cocktails')
      .select(`
        *,
        cocktail_ingredients (
          id,
          amount,
          unit,
          ingredients (
            id,
            name,
            price,
            type
          )
        )
      `)
      .order('name');

    if (error) {
      console.error('Error fetching cocktails:', error);
      return;
    }

    setCocktails(data || []);
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
        ingredients: cocktail.ingredients.map(ci => ({
          ...ci,
          ingredient: ingredients.find(i => i.id === ci.ingredient_id)!
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
          ingredient_id: ingredient.id,
          ingredient,
          amount: 0,
          unit: 'oz'
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

    const cocktailData = {
      name: formData.name,
      description: formData.description || null,
      image_url: formData.image_url || null,
    };

    let cocktailId: string;

    if (editingCocktail) {
      // Update cocktail
      const { error: cocktailError } = await supabase
        .from('cocktails')
        .update(cocktailData)
        .eq('id', editingCocktail.id);

      if (cocktailError) {
        console.error('Error updating cocktail:', cocktailError);
        return;
      }

      cocktailId = editingCocktail.id;

      // Delete existing ingredients
      const { error: deleteError } = await supabase
        .from('cocktail_ingredients')
        .delete()
        .eq('cocktail_id', editingCocktail.id);

      if (deleteError) {
        console.error('Error deleting cocktail ingredients:', deleteError);
        return;
      }
    } else {
      // Create new cocktail
      const { data: newCocktail, error: cocktailError } = await supabase
        .from('cocktails')
        .insert([cocktailData])
        .select()
        .single();

      if (cocktailError) {
        console.error('Error creating cocktail:', cocktailError);
        return;
      }

      cocktailId = newCocktail.id;
    }

    // Add ingredients
    const { error: ingredientsError } = await supabase
      .from('cocktail_ingredients')
      .insert(
        formData.ingredients.map(ing => ({
          cocktail_id: cocktailId,
          ingredient_id: ing.ingredient_id,
          amount: ing.amount,
          unit: ing.unit
        }))
      );

    if (ingredientsError) {
      console.error('Error adding cocktail ingredients:', ingredientsError);
      return;
    }

    handleClose();
    fetchCocktails();
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Manage Cocktails</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Cocktail
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Ingredients</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cocktails.map((cocktail) => (
              <TableRow key={cocktail.id}>
                <TableCell>{cocktail.name}</TableCell>
                <TableCell>{cocktail.description}</TableCell>
                <TableCell>
                  {cocktail.ingredients.map((ing, index) => {
                    const ingredient = ingredients.find(i => i.id === ing.ingredient_id);
                    return ingredient ? (
                      <Chip
                        key={index}
                        label={`${ingredient.name} (${ing.amount} ${ing.unit})`}
                        size="small"
                        sx={{ m: 0.5 }}
                      />
                    ) : null;
                  })}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(cocktail)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(cocktail.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingCocktail ? 'Edit Cocktail' : 'Add New Cocktail'}
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
              
              {Object.entries(groupedIngredients).map(([type, typeIngredients]) => (
                <Accordion key={type}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{type.charAt(0).toUpperCase() + type.slice(1)}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {typeIngredients.map((ingredient) => (
                        <Chip
                          key={ingredient.id}
                          label={`${ingredient.name} ($${ingredient.price?.toFixed(2)}/oz)`}
                          onClick={() => handleAddIngredient(ingredient)}
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}

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
    </Box>
  );
} 