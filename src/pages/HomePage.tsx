import { Box, Container, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { FeaturedCocktails } from './FeaturedCocktails';
import { useBar } from '../contexts/BarContext';
import { barPath } from '../utils/barPaths';

export function HomePage() {
  const { bar } = useBar();
  const slug = bar!.slug;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Featured Cocktails
        </Typography>
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to={barPath(slug, 'cocktails')}
        >
          View All Cocktails
        </Button>
      </Box>
      <FeaturedCocktails />
    </Container>
  );
} 