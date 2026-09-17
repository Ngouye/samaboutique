-- Create reviews table
CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    customer_name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read reviews
CREATE POLICY "Reviews are viewable by everyone." 
ON public.reviews FOR SELECT 
USING (true);

-- Policy: Insert requires a valid order_id (We keep it open for now, the backend will verify)
CREATE POLICY "Anyone can insert reviews." 
ON public.reviews FOR INSERT 
WITH CHECK (true);

-- Policy: Merchants can delete reviews for their own products
CREATE POLICY "Merchants can delete reviews for their products." 
ON public.reviews FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.products 
        WHERE products.id = reviews.product_id 
        AND products.merchant_id = auth.uid()
    )
);
