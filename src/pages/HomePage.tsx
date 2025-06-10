import { Box, Container, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { FeaturedCocktails } from './FeaturedCocktails';

export function HomePage() {
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
          to="/cocktails"
        >
          View All Cocktails
        </Button>
      </Box>
      <FeaturedCocktails />
    </Container>
  );
} 