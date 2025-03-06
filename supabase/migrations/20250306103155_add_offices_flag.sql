-- Dodaj pole is_visible do tabeli offices
ALTER TABLE public.offices
ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT TRUE;

-- Ustaw domyślne wartości dla istniejących biur
UPDATE public.offices
SET is_visible = TRUE;