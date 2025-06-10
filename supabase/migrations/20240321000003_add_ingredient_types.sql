-- Add new ingredient types
ALTER TYPE ingredient_type ADD VALUE IF NOT EXISTS 'bitters';
ALTER TYPE ingredient_type ADD VALUE IF NOT EXISTS 'juice';

-- Add comments to explain the new types
COMMENT ON TYPE ingredient_type IS 'Types of ingredients: spirit, liqueur, syrup, bitters, juice, other'; 