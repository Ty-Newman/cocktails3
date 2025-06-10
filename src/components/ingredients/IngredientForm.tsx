import { useState } from 'react';
import {
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Box,
  Paper,
} from '@mui/material';
import type { Ingredient } from '../../types/ingredient';

interface IngredientFormProps {
  initialData?: Partial<Ingredient>;
  onSubmit: (data: Partial<Ingredient>) => void;
  onCancel: () => void;
}

export default function IngredientForm({ initialData, onSubmit, onCancel }: IngredientFormProps) {
  const [formData, setFormData] = useState<Partial<Ingredient>>({
    name: '',
    description: '',
    price: 0,
    bottle_size: 0,
    type: 'spirit',
    is_bottled: true,
    image_url: '',
    ...initialData,
  });

  const handleChange = (field: keyof Ingredient, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
              label="Bottle Size (ml)"
              type="number"
              value={formData.bottle_size}
              onChange={(e) => handleChange('bottle_size', parseFloat(e.target.value))}
              required
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Type"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              required
              select
              SelectProps={{ native: true }}
            >
              <option value="spirit">Spirit</option>
              <option value="liqueur">Liqueur</option>
              <option value="wine">Wine</option>
              <option value="beer">Beer</option>
              <option value="mixer">Mixer</option>
              <option value="garnish">Garnish</option>
            </TextField>
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
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_bottled}
                  onChange={(e) => handleChange('is_bottled', e.target.checked)}
                />
              }
              label="Is Bottled"
            />
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