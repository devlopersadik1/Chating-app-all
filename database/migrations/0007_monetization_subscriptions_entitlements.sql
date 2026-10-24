-- Talviro Chat migration 0007
-- Monetization, paid channel subscriptions, creator earnings, referral rewards and feature entitlements.
-- Review schema and take a verified backup before applying to any live database.

CREATE TABLE IF NOT EXISTS feature_entitlements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entitlement_key VARCHAR(100) NOT NULL,
  display_name VARCHAR(140) NOT NULL,
  description VARCHAR(500) NULL,
  entitlement_type ENUM('premium','subscription','stars','admin_grant','promo') NOT NULL DEFAULT 'premium',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_feature_entitlement_key (entitlement_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plan_entitlements (
  plan_id BIGINT UNSIGNED NOT NULL,
  entitlement_id BIGINT UNSIGNED NOT NULL,
  limit_value BIGINT NULL,
  config_json JSON NULL,
  PRIMARY KEY (plan_id, entitlement_id),
  CONSTRAINT fk_plan_entitlements_plan FOREIGN KEY (plan_id) REFERENCES premium_plans(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_plan_entitlements_feature FOREIGN KEY (entitlement_id) REFERENCES feature_entitlements(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_entitlement_grants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  entitlement_id BIGINT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NULL,
  source_type ENUM('subscription','purchase','admin','promotion','refund_reversal') NOT NULL,
  source_reference VARCHAR(190) NULL,
  starts_at DATETIME NOT NULL,
  expires_at DATETIME NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_entitlement_user_active (user_id, entitlement_id, starts_at, expires_at, revoked_at),
  KEY idx_entitlement_source (source_type, source_reference),
  CONSTRAINT fk_entitlement_grant_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_entitlement_grant_feature FOREIGN KEY (entitlement_id) REFERENCES feature_entitlements(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_entitlement_grant_admin FOREIGN KEY (granted_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_subscription_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  price_amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  duration_days INT UNSIGNED NOT NULL,
  benefits_json JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_channel_subscription_plans (channel_id, is_active),
  CONSTRAINT fk_channel_sub_plan_channel FOREIGN KEY (channel_id) REFERENCES channels(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  channel_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  payment_transaction_id BIGINT UNSIGNED NULL,
  status ENUM('pending','active','expired','cancelled','refunded') NOT NULL DEFAULT 'pending',
  starts_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_channel_sub_user_status (user_id, status, expires_at),
  KEY idx_channel_sub_channel_status (channel_id, status, expires_at),
  CONSTRAINT fk_channel_sub_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_channel_sub_channel FOREIGN KEY (channel_id) REFERENCES channels(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_channel_sub_plan FOREIGN KEY (plan_id) REFERENCES channel_subscription_plans(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_channel_sub_payment FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_post_access (
  post_id BIGINT UNSIGNED NOT NULL,
  access_type ENUM('public','channel_members','paid_subscribers','premium_users') NOT NULL DEFAULT 'channel_members',
  required_plan_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (post_id),
  KEY idx_channel_post_access_type (access_type),
  CONSTRAINT fk_channel_post_access_post FOREIGN KEY (post_id) REFERENCES channel_posts(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_channel_post_access_plan FOREIGN KEY (required_plan_id) REFERENCES channel_subscription_plans(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS creator_earnings_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  creator_user_id BIGINT UNSIGNED NOT NULL,
  source_type ENUM('paid_channel_subscription','gift','ad_revenue','stars_conversion','adjustment','refund') NOT NULL,
  source_reference VARCHAR(190) NULL,
  gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  platform_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL,
  status ENUM('pending','available','paid','reversed','on_hold') NOT NULL DEFAULT 'pending',
  available_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_creator_earnings (creator_user_id, status, created_at),
  KEY idx_creator_earnings_source (source_type, source_reference),
  CONSTRAINT fk_creator_earnings_user FOREIGN KEY (creator_user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS creator_payout_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  creator_user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  payout_method VARCHAR(60) NOT NULL,
  payout_destination_encrypted TEXT NULL,
  status ENUM('requested','under_review','approved','processing','paid','rejected','cancelled') NOT NULL DEFAULT 'requested',
  reviewed_by BIGINT UNSIGNED NULL,
  review_note VARCHAR(500) NULL,
  provider_reference VARCHAR(190) NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  paid_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_payout_creator_status (creator_user_id, status, requested_at),
  KEY idx_payout_review_queue (status, requested_at),
  CONSTRAINT fk_payout_creator FOREIGN KEY (creator_user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_payout_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  reward_config_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referral_code (code),
  KEY idx_referral_owner (owner_user_id, is_active),
  CONSTRAINT fk_referral_code_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_attributions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  referral_code_id BIGINT UNSIGNED NOT NULL,
  referred_user_id BIGINT UNSIGNED NOT NULL,
  reward_status ENUM('pending','qualified','rewarded','rejected') NOT NULL DEFAULT 'pending',
  qualified_at DATETIME NULL,
  rewarded_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referral_referred_user (referred_user_id),
  KEY idx_referral_status (reward_status, created_at),
  CONSTRAINT fk_referral_attribution_code FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_referral_attribution_user FOREIGN KEY (referred_user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_ad_preferences (
  user_id BIGINT UNSIGNED NOT NULL,
  personalized_ads_enabled TINYINT(1) NOT NULL DEFAULT 0,
  non_personalized_ads_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_ad_preferences_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
