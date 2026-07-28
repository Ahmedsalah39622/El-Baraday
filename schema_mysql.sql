-- ============================================================
-- El-Baraday POS System - MySQL Database Schema (phpMyAdmin)
-- مطعم البرادعي للحواوشي
-- Database: u407531143_bara
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `app_settings`;
DROP TABLE IF EXISTS `inventory_transactions`;
DROP TABLE IF EXISTS `inventory_items`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `employee_advances`;
DROP TABLE IF EXISTS `driver_attendance`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `delivery_areas`;
DROP TABLE IF EXISTS `drivers`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `restaurant_tables`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `branches`;
DROP TABLE IF EXISTS `shifts`;
DROP TABLE IF EXISTS `purchases`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `invoices`;

SET FOREIGN_KEY_CHECKS = 1;

-- ==================== BRANCHES ====================
CREATE TABLE IF NOT EXISTS `branches` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(100),
  `address` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== CATEGORIES ====================
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `icon` VARCHAR(100),
  `sort_order` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== PRODUCTS ====================
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(100) PRIMARY KEY,
  `category_id` VARCHAR(100),
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `original_price` DECIMAL(10, 2) DEFAULT NULL,
  `is_offer` TINYINT(1) DEFAULT 0,
  `offer_components` TEXT,
  `size` VARCHAR(100) DEFAULT 'كبير',
  `has_sizes` TINYINT(1) DEFAULT 0,
  `price_small` DECIMAL(10, 2) DEFAULT NULL,
  `price_large` DECIMAL(10, 2) DEFAULT NULL,
  `sizes` JSON DEFAULT NULL,
  `image_url` LONGTEXT,
  `description` TEXT,
  `is_available` TINYINT(1) DEFAULT 1,
  `sort_order` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== RESTAURANT TABLES ====================
CREATE TABLE IF NOT EXISTS `restaurant_tables` (
  `id` VARCHAR(100) PRIMARY KEY,
  `number` VARCHAR(100) NOT NULL UNIQUE,
  `status` VARCHAR(50) DEFAULT 'available',
  `seats` INT DEFAULT 4,
  `branch_id` VARCHAR(100) DEFAULT 'b1',
  `current_order_id` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== CUSTOMERS ====================
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(100) UNIQUE,
  `address` TEXT,
  `area` VARCHAR(100),
  `floor` VARCHAR(50),
  `apartment` VARCHAR(50),
  `landmark` TEXT,
  `addresses` JSON,
  `total_orders` INT DEFAULT 0,
  `total_spend` DECIMAL(10, 2) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== DRIVERS ====================
CREATE TABLE IF NOT EXISTS `drivers` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(100),
  `status` VARCHAR(50) DEFAULT 'active',
  `branch_id` VARCHAR(100) DEFAULT 'b1',
  `is_available` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== DELIVERY AREAS ====================
CREATE TABLE IF NOT EXISTS `delivery_areas` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `delivery_fee` DECIMAL(10, 2) DEFAULT 15.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== EMPLOYEES ====================
CREATE TABLE IF NOT EXISTS `employees` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(100),
  `role` VARCHAR(100) DEFAULT 'كاشير',
  `base_salary` DECIMAL(10, 2) DEFAULT 0,
  `hourly_rate` DECIMAL(10, 2) DEFAULT 0,
  `overtime_hours` DECIMAL(10, 2) DEFAULT 0,
  `deduction_hours` DECIMAL(10, 2) DEFAULT 0,
  `bonus` DECIMAL(10, 2) DEFAULT 0,
  `deductions` DECIMAL(10, 2) DEFAULT 0,
  `branch_id` VARCHAR(100) DEFAULT 'b1',
  `status` VARCHAR(50) DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== EMPLOYEE ADVANCES (سلف) ====================
CREATE TABLE IF NOT EXISTS `employee_advances` (
  `id` VARCHAR(100) PRIMARY KEY,
  `employee_id` VARCHAR(100),
  `employee_name` VARCHAR(255),
  `amount` DECIMAL(10, 2) NOT NULL,
  `month` VARCHAR(50),
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== EMPLOYEE BONUS & DEDUCTIONS (سجل البونص والخصومات) ====================
CREATE TABLE IF NOT EXISTS `employee_bonus_deductions` (
  `id` VARCHAR(100) PRIMARY KEY,
  `employee_id` VARCHAR(100),
  `employee_name` VARCHAR(255),
  `type` VARCHAR(50) NOT NULL, -- 'bonus' or 'deduction'
  `category` VARCHAR(100) DEFAULT 'direct_cash', -- 'full_attendance', 'overtime_hours', 'deduction_hours', 'direct_cash'
  `value_hours` DECIMAL(10, 2) DEFAULT 0,
  `amount` DECIMAL(10, 2) NOT NULL,
  `month` VARCHAR(50),
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SALARY PAYMENTS (سجل صرف المرتبات والقبض) ====================
CREATE TABLE IF NOT EXISTS `salary_payments` (
  `id` VARCHAR(100) PRIMARY KEY,
  `employee_id` VARCHAR(100),
  `employee_name` VARCHAR(255),
  `base_salary` DECIMAL(10, 2) DEFAULT 0,
  `hourly_rate` DECIMAL(10, 2) DEFAULT 0,
  `overtime_hours` DECIMAL(10, 2) DEFAULT 0,
  `overtime_amount` DECIMAL(10, 2) DEFAULT 0,
  `deduction_hours` DECIMAL(10, 2) DEFAULT 0,
  `deduction_amount` DECIMAL(10, 2) DEFAULT 0,
  `bonus_amount` DECIMAL(10, 2) DEFAULT 0,
  `direct_deductions` DECIMAL(10, 2) DEFAULT 0,
  `advances_amount` DECIMAL(10, 2) DEFAULT 0,
  `net_paid` DECIMAL(10, 2) NOT NULL,
  `month` VARCHAR(50),
  `notes` TEXT,
  `payment_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== DRIVER ATTENDANCE (حضور وحالة الطيارين) ====================
CREATE TABLE IF NOT EXISTS `driver_attendance` (
  `id` VARCHAR(100) PRIMARY KEY,
  `driver_id` VARCHAR(100),
  `driver_name` VARCHAR(255) NOT NULL,
  `branch_id` VARCHAR(100) DEFAULT 'b1',
  `status` VARCHAR(50) DEFAULT 'ready',
  `queue_position` INT DEFAULT 1,
  `current_order_id` VARCHAR(100),
  `check_in_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `check_out_time` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== USERS (نظام المستخدمين والصلاحيات) ====================
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(100) PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `pin` VARCHAR(50) DEFAULT '1234',
  `role` VARCHAR(50) DEFAULT 'cashier',
  `permissions` JSON,
  `status` VARCHAR(50) DEFAULT 'active',
  `avatar` TEXT,
  `branch_id` VARCHAR(100) DEFAULT 'b1',
  `last_login` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== ORDERS ====================
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(100) PRIMARY KEY,
  `order_number` INT AUTO_INCREMENT UNIQUE,
  `order_type` VARCHAR(50) DEFAULT 'dine_in',
  `table_number` VARCHAR(100),
  `customer_id` VARCHAR(100),
  `customer_name` VARCHAR(255),
  `customer_phone` VARCHAR(100),
  `customer_area` VARCHAR(255),
  `customer_address` TEXT,
  `driver_id` VARCHAR(100),
  `driver_name` VARCHAR(255),
  `branch_id` VARCHAR(100) DEFAULT 'b1',
  `status` VARCHAR(50) DEFAULT 'completed',
  `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `delivery_fee` DECIMAL(10, 2) DEFAULT 0,
  `discount` DECIMAL(10, 2) DEFAULT 0,
  `total` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `paid_amount` DECIMAL(10, 2) DEFAULT 0,
  `remaining_amount` DECIMAL(10, 2) DEFAULT 0,
  `payment_method` VARCHAR(50) DEFAULT 'cash',
  `cashier_name` VARCHAR(255) DEFAULT 'administrator',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== ORDER ITEMS ====================
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` VARCHAR(100) PRIMARY KEY,
  `order_id` VARCHAR(100),
  `product_id` VARCHAR(100),
  `product_name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `quantity` INT DEFAULT 1,
  `size` VARCHAR(100),
  `extras` TEXT,
  `notes` TEXT,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SHIFTS ====================
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` VARCHAR(100) PRIMARY KEY,
  `cashier_name` VARCHAR(255) NOT NULL,
  `branch_id` VARCHAR(100) DEFAULT 'b1',
  `start_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` DATETIME,
  `start_amount` DECIMAL(10, 2) DEFAULT 0,
  `end_amount` DECIMAL(10, 2) DEFAULT 0,
  `expected_amount` DECIMAL(10, 2) DEFAULT 0,
  `cash_difference` DECIMAL(10, 2) DEFAULT 0,
  `difference_type` VARCHAR(50) DEFAULT 'balanced',
  `cash_sales` DECIMAL(10, 2) DEFAULT 0,
  `total_orders` INT DEFAULT 0,
  `notes` TEXT,
  `status` VARCHAR(50) DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== INVENTORY ITEMS (خامات) ====================
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(50) DEFAULT 'كجم',
  `current_stock` DECIMAL(10, 2) DEFAULT 0,
  `min_stock` DECIMAL(10, 2) DEFAULT 0,
  `cost_per_unit` DECIMAL(10, 2) DEFAULT 0,
  `category` VARCHAR(100),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== INVENTORY TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` VARCHAR(100) PRIMARY KEY,
  `item_id` VARCHAR(100),
  `type` VARCHAR(50) DEFAULT 'in',
  `quantity` DECIMAL(10, 2) NOT NULL,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== EXPENSES (مصروفات) ====================
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` VARCHAR(100) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `category` VARCHAR(100) DEFAULT 'نثريات',
  `branch_id` VARCHAR(100) DEFAULT 'b1',
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== INVOICES (الفواتير والتحصيل) ====================
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(100) PRIMARY KEY,
  `invoice_number` VARCHAR(100) NOT NULL UNIQUE,
  `title` VARCHAR(255) DEFAULT 'فاتورة تحصيل',
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(100),
  `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `remaining_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `payment_status` VARCHAR(50) DEFAULT 'paid',
  `payment_method` VARCHAR(50) DEFAULT 'cash',
  `invoice_date` DATE NOT NULL,
  `notes` TEXT,
  `items` JSON DEFAULT NULL,
  `branch_id` VARCHAR(100) DEFAULT 'b1',
  `created_by` VARCHAR(100) DEFAULT 'administrator',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== PURCHASES (مشتريات خامات) ====================
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` VARCHAR(100) PRIMARY KEY,
  `supplier_name` VARCHAR(255),
  `item_id` VARCHAR(100),
  `item_name` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL,
  `unit_price` DECIMAL(10, 2) NOT NULL,
  `total_cost` DECIMAL(10, 2) NOT NULL,
  `branch_id` VARCHAR(100) DEFAULT 'b1',
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== PRIZE DRAWS & WHEEL SPINS (السحب والجوائز) ====================
CREATE TABLE IF NOT EXISTS `prize_draws` (
  `id` VARCHAR(100) PRIMARY KEY,
  `prize_title` VARCHAR(255) NOT NULL,
  `winner_name` VARCHAR(255) NOT NULL,
  `winner_phone` VARCHAR(100),
  `customer_id` VARCHAR(100),
  `invoice_number` VARCHAR(100),
  `draw_type` VARCHAR(50) DEFAULT 'raffle',
  `status` VARCHAR(50) DEFAULT 'claimed',
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wheel_spins` (
  `id` VARCHAR(100) PRIMARY KEY,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(100),
  `prize_won` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `raffle_coupons` (
  `id` VARCHAR(100) PRIMARY KEY,
  `coupon_number` VARCHAR(100) NOT NULL UNIQUE,
  `customer_id` VARCHAR(100),
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(100),
  `invoice_number` VARCHAR(100),
  `raffle_title` VARCHAR(255) DEFAULT 'سحب الجائزة الكبرى',
  `printed_by` VARCHAR(100) DEFAULT 'administrator',
  `status` VARCHAR(50) DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== APP SETTINGS ====================
CREATE TABLE IF NOT EXISTS `app_settings` (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INITIAL SEED DATA
-- ============================================================

INSERT IGNORE INTO `branches` (`id`, `name`, `phone`, `address`, `is_active`) VALUES
  ('b1', 'الفرع الرئيسي', '01012345678', 'شارع الرئيسي', 1);

INSERT IGNORE INTO `categories` (`id`, `name`, `icon`, `sort_order`) VALUES
  ('1', 'حواوشي', '🍔', 1),
  ('2', 'ميكسات', '🍕', 2),
  ('3', 'مشروبات', '🥤', 3),
  ('4', 'إضافات', '🧀', 4),
  ('5', 'العروض', '🏷️', 5);

INSERT IGNORE INTO `restaurant_tables` (`id`, `number`, `status`, `seats`, `branch_id`) VALUES
  ('t1', 'T-01', 'available', 2, 'b1'),
  ('t2', 'T-02', 'available', 6, 'b1'),
  ('t3', 'T-03', 'available', 4, 'b1'),
  ('t4', 'T-04', 'available', 4, 'b1'),
  ('t5', 'T-05', 'available', 2, 'b1'),
  ('t6', 'T-06', 'available', 2, 'b1'),
  ('t7', 'T-07', 'available', 4, 'b1'),
  ('t8', 'T-08', 'available', 4, 'b1'),
  ('t9', 'T-09', 'available', 2, 'b1'),
  ('t10', 'T-10', 'available', 6, 'b1');

INSERT IGNORE INTO `drivers` (`id`, `name`, `phone`, `status`, `branch_id`) VALUES
  ('d1', 'محمد علي الصوفي', '01012345678', 'active', 'b1'),
  ('d2', 'أحمد عبد الفتاح', '01098765432', 'active', 'b1'),
  ('d3', 'محمود السويفي', '01123456789', 'active', 'b1'),
  ('d4', 'خالد طارق', '01234567890', 'active', 'b1');

INSERT IGNORE INTO `delivery_areas` (`id`, `name`, `delivery_fee`) VALUES
  ('a1', 'وسط البلد', 15.00),
  ('a2', 'شارع الجيش', 15.00),
  ('a3', 'المنشية', 20.00),
  ('a4', 'الزقازيق', 25.00),
  ('a5', 'التجاري', 10.00);

INSERT IGNORE INTO `employees` (`id`, `name`, `phone`, `role`, `base_salary`, `branch_id`) VALUES
  ('e1', 'محمد علي الصوفي', '01012345678', 'طيار دليفري', 4500, 'b1'),
  ('e2', 'أحمد عبد الفتاح', '01098765432', 'طيار دليفري', 4500, 'b1'),
  ('e3', 'محمود السويفي', '01123456789', 'طيار دليفري', 4500, 'b1'),
  ('e4', 'خالد طارق', '01234567890', 'طيار دليفري', 4500, 'b1'),
  ('e5', 'عمر حسن', '01056789012', 'كاشير', 5000, 'b1'),
  ('e6', 'يوسف إبراهيم', '01067890123', 'شيف مطبخ', 6000, 'b1');

INSERT IGNORE INTO `users` (`id`, `username`, `name`, `pin`, `role`, `permissions`, `branch_id`) VALUES
  ('u1', 'admin', 'المدير العام', '1234', 'admin', '["pos","tables","delivery","inventory","salaries","reports","settings","admin","attendance","shift-summary"]', 'b1'),
  ('u2', 'cashier', 'كاشير 1', '1234', 'cashier', '["pos","tables","delivery","attendance"]', 'b1');

INSERT IGNORE INTO `inventory_items` (`id`, `name`, `unit`, `current_stock`, `min_stock`, `cost_per_unit`, `category`) VALUES
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
  ('inv12', 'مياه معدنية', 'عبوة', 96, 24, 4, 'مشروبات');

INSERT IGNORE INTO `app_settings` (`key`, `value`) VALUES
  ('company_name', 'مطعم البرادعي للحواوشي'),
  ('company_phone', '01012345678'),
  ('company_address', 'المحل الرئيسي'),
  ('tax_rate', '0'),
  ('delivery_default_fee', '15'),
  ('counter_name', 'الكاونتر الرئيسي');
