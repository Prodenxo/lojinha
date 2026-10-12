CREATE TABLE IF NOT EXISTS products (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partner_id    INT UNSIGNED NULL UNIQUE,
  slug          VARCHAR(160) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT NULL,
  category      VARCHAR(120) NOT NULL DEFAULT 'Outros',
  emoji         VARCHAR(16) NULL,
  delivery_type VARCHAR(40) NULL,
  duration_days INT NULL,
  cost_usd      DECIMAL(10,2) NULL,
  price_brl     DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_locked  TINYINT(1) NOT NULL DEFAULT 0,
  promo_price_brl DECIMAL(10,2) NULL,
  featured      TINYINT(1) NOT NULL DEFAULT 0,
  stock         INT NOT NULL DEFAULT 0,
  images        JSON NULL,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  synced_at     DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_active_category (active, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(40) NOT NULL UNIQUE,
  product_id      INT UNSIGNED NOT NULL,
  product_name    VARCHAR(255) NOT NULL,
  amount_cents    INT UNSIGNED NOT NULL,
  customer_email  VARCHAR(255) NOT NULL,
  customer_phone  VARCHAR(30) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  checkout_url    VARCHAR(500) NULL,
  transaction_nsu VARCHAR(100) NULL,
  invoice_slug    VARCHAR(100) NULL,
  capture_method  VARCHAR(30) NULL,
  receipt_url     VARCHAR(500) NULL,
  delivery        TEXT NULL,
  paid_at         DATETIME NULL,
  delivered_at    DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_access (
  token      VARCHAR(64) PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_access_email (email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
