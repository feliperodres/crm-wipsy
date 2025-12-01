-- Update payment method constraint to include more options
ALTER TABLE public.orders 
DROP CONSTRAINT orders_payment_method_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method = ANY (ARRAY[
  'Pago Contra Entrega'::text, 
  'Anticipado'::text,
  'transferencia'::text,
  'Transferencia'::text,
  'efectivo'::text,
  'Efectivo'::text,
  'tarjeta'::text,
  'Tarjeta'::text
]));