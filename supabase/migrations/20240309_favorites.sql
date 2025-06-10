-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cocktail_id UUID REFERENCES public.cocktails(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, cocktail_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own favorites"
    ON public.favorites
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
    ON public.favorites
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
    ON public.favorites
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to check if a cocktail is favorited
CREATE OR REPLACE FUNCTION public.is_cocktail_favorited(cocktail_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.favorites
        WHERE user_id = auth.uid()
        AND cocktail_id = $1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 