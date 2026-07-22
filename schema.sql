-- ============================================================
-- El-Baraday POS System - Full Database Schema
-- مطعم البرادعي للحواوشي
-- ============================================================

-- ==================== CATEGORIES ====================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT DEFAULT 0
);

-- ==================== PRODUCTS ====================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  size TEXT DEFAULT 'كبير',
  image_url TEXT,
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== RESTAURANT TABLES ====================
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  number TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'available',
  seats INT DEFAULT 4,
  current_order_id TEXT
);

-- ==================== CUSTOMERS ====================
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  address TEXT,
  area TEXT,
  landmark TEXT,
  total_orders INT DEFAULT 0,
  total_spend NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== DRIVERS ====================
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== DELIVERY AREAS ====================
CREATE TABLE IF NOT EXISTS delivery_areas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  delivery_fee NUMERIC(10, 2) DEFAULT 15
);

-- ==================== EMPLOYEES ====================
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'كاشير',
  base_salary NUMERIC(10, 2) DEFAULT 0,
  bonus NUMERIC(10, 2) DEFAULT 0,
  deductions NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== EMPLOYEE ADVANCES (سلف) ====================
CREATE TABLE IF NOT EXISTS employee_advances (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  month TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== ORDERS ====================
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_number SERIAL,
  order_type TEXT DEFAULT 'dine_in',
  table_number TEXT,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_area TEXT,
  customer_address TEXT,
  driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  driver_name TEXT,
  status TEXT DEFAULT 'completed',
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10, 2) DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10, 2) DEFAULT 0,
  remaining_amount NUMERIC(10, 2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  cashier_name TEXT DEFAULT 'administrator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== ORDER ITEMS ====================
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INT DEFAULT 1,
  size TEXT,
  extras TEXT,
  notes TEXT
);

-- ==================== SHIFTS ====================
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  cashier_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP WITH TIME ZONE,
  start_amount NUMERIC(10, 2) DEFAULT 0,
  end_amount NUMERIC(10, 2) DEFAULT 0,
  cash_sales NUMERIC(10, 2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  status TEXT DEFAULT 'active'
);

-- ==================== INVENTORY ITEMS (خامات) ====================
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'كجم',
  current_stock NUMERIC(10, 2) DEFAULT 0,
  min_stock NUMERIC(10, 2) DEFAULT 0,
  cost_per_unit NUMERIC(10, 2) DEFAULT 0,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== INVENTORY TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  item_id TEXT REFERENCES inventory_items(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'in',
  quantity NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== APP SETTINGS ====================
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Categories
INSERT INTO categories (id, name, icon, sort_order) VALUES
  ('1', 'حواوشي', '🍔', 1),
  ('2', 'ميكسات', '🍕', 2),
  ('3', 'مشروبات', '🥤', 3),
  ('4', 'إضافات', '🧀', 4),
  ('5', 'العروض', '🏷️', 5)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (id, category_id, name, price, size, image_url) VALUES
  ('p1', '1', 'حواوشي ساده صغير', 45.00, 'صغير', '/images/hawawshi_sade.png'),
  ('p2', '1', 'حواوشي ساده كبير', 75.00, 'كبير', '/images/hawawshi_sade.png'),
  ('p3', '1', 'حواوشي فراخ صغير', 55.00, 'صغير', '/images/hawawshi_chicken.png'),
  ('p4', '1', 'حواوشي فراخ كبير', 90.00, 'كبير', '/images/hawawshi_chicken.png'),
  ('p5', '1', 'حواوشي سلامي صغير', 65.00, 'صغير', '/images/hawawshi_salami.png'),
  ('p6', '1', 'حواوشي سلامي كبير', 110.00, 'كبير', '/images/hawawshi_salami.png'),
  ('p7', '1', 'حواوشي سجق صغير', 60.00, 'صغير', '/images/hawawshi_sausage.png'),
  ('p8', '1', 'حواوشي سجق كبير', 100.00, 'كبير', '/images/hawawshi_sausage.png'),
  ('p9', '2', 'حواوشي ميكس أجبان صغير', 70.00, 'صغير', '/images/hawawshi_mixes.png'),
  ('p10', '2', 'حواوشي ميكس أجبان كبير', 120.00, 'كبير', '/images/hawawshi_mixes.png'),
  ('p11', '4', 'إضافة جبنة موتزاريلا', 25.00, 'عادي', '/images/cheese_addition.png'),
  ('p12', '4', 'إضافة جبنة رومي', 20.00, 'عادي', '/images/cheese_addition.png'),
  ('p13', '4', 'إضافة جبنة شيدر', 20.00, 'عادي', '/images/cheese_addition.png'),
  ('p14', '3', 'بيبسي كولا 1 لتر', 30.00, '1L', '/images/pepsi.png'),
  ('p15', '3', 'مياه معدنية', 10.00, 'صغير', '/images/mineral_water.png')
ON CONFLICT (id) DO NOTHING;

-- Tables
INSERT INTO restaurant_tables (id, number, status, seats) VALUES
  ('t1', 'T-01', 'available', 2),
  ('t2', 'T-02', 'available', 6),
  ('t3', 'T-03', 'available', 4),
  ('t4', 'T-04', 'available', 4),
  ('t5', 'T-05', 'available', 2),
  ('t6', 'T-06', 'available', 2),
  ('t7', 'T-07', 'available', 4),
  ('t8', 'T-08', 'available', 4),
  ('t9', 'T-09', 'available', 2),
  ('t10', 'T-10', 'available', 6)
ON CONFLICT (id) DO NOTHING;

-- Drivers
INSERT INTO drivers (id, name, phone, status) VALUES
  ('d1', 'محمد علي الصوفي', '01012345678', 'active'),
  ('d2', 'أحمد عبد الفتاح', '01098765432', 'active'),
  ('d3', 'محمود السويفي', '01123456789', 'active'),
  ('d4', 'خالد طارق', '01234567890', 'active')
ON CONFLICT (id) DO NOTHING;

-- Delivery Areas
INSERT INTO delivery_areas (id, name, delivery_fee) VALUES
  ('a1', ' ', 15.00),
  ('a2', 'شارع الجيش', 15.00),
  ('a3', 'المنشية', 20.00),
  ('a4', 'الزقازيق', 25.00),
  ('a5', 'التجاري', 10.00)
ON CONFLICT (id) DO NOTHING;

-- Employees
INSERT INTO employees (id, name, phone, role, base_salary) VALUES
  ('e1', 'محمد علي الصوفي', '01012345678', 'طيار دليفري', 4500),
  ('e2', 'أحمد عبد الفتاح', '01098765432', 'طيار دليفري', 4500),
  ('e3', 'محمود السويفي', '01123456789', 'طيار دليفري', 4500),
  ('e4', 'خالد طارق', '01234567890', 'طيار دليفري', 4500),
  ('e5', 'عمر حسن', '01056789012', 'كاشير', 5000),
  ('e6', 'يوسف إبراهيم', '01067890123', 'شيف مطبخ', 6000)
ON CONFLICT (id) DO NOTHING;

-- Inventory Items (خامات)
INSERT INTO inventory_items (id, name, unit, current_stock, min_stock, cost_per_unit, category) VALUES
  ('inv1', 'لحمة مفرومة', 'كجم', 50, 10, 250, 'لحوم'),
  ('inv2', 'عجينة بلدي', 'كجم', 30, 5, 20, 'عجائن'),
  ('inv3', 'جبنة موتزاريلا', 'كجم', 15, 3, 180, 'أجبان'),
  ('inv4', 'جبنة رومي', 'كجم', 10, 2, 200, 'أجبان'),
  ('inv5', 'جبنة شيدر', 'كجم', 10, 2, 160, 'أجبان'),
  ('inv6', 'سلامي', 'كجم', 8, 2, 280, 'لحوم'),
  ('inv7', 'سجق', 'كجم', 10, 3, 200, 'لحوم'),
  ('inv8', 'فراخ مسحبة', 'كجم', 20, 5, 150, 'لحوم'),
  ('inv9', 'بصل', 'كجم', 25, 5, 15, 'خضروات'),
  ('inv10', 'فلفل أخضر', 'كجم', 10, 2, 25, 'خضروات'),
  ('inv11', 'بيبسي 1 لتر', 'عبوة', 48, 12, 18, 'مشروبات'),
  ('inv12', 'مياه معدنية', 'عبوة', 96, 24, 4, 'مشروبات')
ON CONFLICT (id) DO NOTHING;

-- App Settings
INSERT INTO app_settings (key, value) VALUES
  ('company_name', 'مطعم البراضعي للحواوشي'),
  ('company_phone', ''),
  ('company_address', ''),
  ('tax_rate', '0'),
  ('delivery_default_fee', '15'),
  ('counter_name', 'الكاونتر الرئيسي')
ON CONFLICT (key) DO NOTHING;
