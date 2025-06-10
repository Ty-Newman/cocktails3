import { useState } from 'react';
import {
  TextField,
  Button,
  Grid,
  IconButton,
  Typography,
  Box,
  Paper,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import type { Cocktail } from '../../types/cocktail';

interface CocktailFormProps {
  initialData?: Partial<Cocktail>;
  onSubmit: (data: Partial<Cocktail>) => void;
  onCancel: () => void;
}

export default function CocktailForm({ initialData, onSubmit, onCancel }: CocktailFormProps) {
  const [formData, setFormData] = useState<Partial<Cocktail>>({
    name: '',
    description: '',
    price: 0,
    image_url: '',
    cocktail_ingredients: [],
    ...initialData,
  });

  const handleChange = (field: keyof Cocktail, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    const newIngredients = [...(formData.cocktail_ingredients || [])];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    handleChange('cocktail_ingredients', newIngredients);
  };

  const handleAddIngredient = () => {
    const newIngredients = [...(formData.cocktail_ingredients || [])];
    newIngredients.push({ ingredient_id: '', amount: 0, unit: 'oz' });
    handleChange('cocktail_ingredients', newIngredients);
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = [...(formData.cocktail_ingredients || [])];
    newIngredients.splice(index, 1);
    handleChange('cocktail_ingredients', newIngredients);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              multiline
              rows={4}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Price"
              type="number"
              value={formData.price}
              onChange={(e) => handleChange('price', parseFloat(e.target.value))}
              required
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Image URL"
              value={formData.image_url}
              onChange={(e) => handleChange('image_url', e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Ingredients</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddIngredient}
                variant="outlined"
              >
                Add Ingredient
              </Button>
            </Box>
            {(formData.cocktail_ingredients || []).map((ingredient, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Ingredient ID"
                  value={ingredient.ingredient_id}
                  onChange={(e) => handleIngredientChange(index, 'ingredient_id', e.target.value)}
                  required
                  sx={{ flex: 2 }}
                />
                <TextField
                  label="Amount"
                  type="number"
                  value={ingredient.amount}
                  onChange={(e) => handleIngredientChange(index, 'amount', parseFloat(e.target.value))}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Unit"
                  value={ingredient.unit}
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                  required
                  sx={{ flex: 1 }}
                />
                <IconButton
                  color="error"
                  onClick={() => handleRemoveIngredient(index)}
                  sx={{ alignSelf: 'center' }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary">
                {initialData ? 'Update' : 'Create'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
} 