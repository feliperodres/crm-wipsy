// Shared types for orders to avoid conflicts

export interface Customer {
  id: string;
  name: string;
  last_name?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    images: any; // Json type that can be string[] or string
  };
}

export interface ShippingTariff {
  id: string;
  name: string;
  price: number;
}

export interface Order {
  id: string;
  customer_id?: string;
  total: number;
  status: string;
  notes?: string;
  payment_method?: string;
  payment_status?: string;
  order_source?: string;
  created_at: string;
  updated_at?: string;
  order_number?: string;
  email?: string;
  source?: 'local' | 'shopify'; // Optional for backward compatibility
  shipping_cost?: number;
  shipping_tariff_id?: string;
  tracking_number?: string;
  customer?: Customer;
  customer_data?: any;
  order_items?: OrderItem[];
  line_items?: any;
  shipping_tariff?: ShippingTariff;
}