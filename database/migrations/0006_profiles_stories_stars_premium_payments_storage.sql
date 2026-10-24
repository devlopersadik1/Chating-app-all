-- Talviro Chat migration 0006
-- Profiles, stories, saved messages, stars, premium entitlements, payments and media library.
-- Check the live schema and take a verified backup before applying.

CREATE TABLE IF NOT EXISTS user_profile_settings (
  user_id BIGINT UNSIGNED NOT NULL,
  display_name VARCHAR(100) NULL,
  bio VARCHAR(160) NULL,
  username VARCHAR(30) NULL,
  profile_photo_path VARCHAR(500) NULL,
  cover_photo_path VARCHAR(500) NULL,
  birth_date DATE NULL,
  privacy_last_seen ENUM('everyone','contacts','nobody') NOT NULL DEFAULT 'everyone',
  privacy_profile_photo ENUM('everyone','contacts','nobody') NOT NULL DEFAULT 'everyone',
  privacy_phone ENUM('everyone','contacts','nobody') NOT NULL DEFAULT 'contacts',
  privacy_calls ENUM('everyone','contacts','nobody') NOT NULL DEFAULT 'everyone',
  allow_group_invites ENUM('everyone','contacts','nobody') NOT NULL DEFAULT 'everyone',
  two_step_enabled TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_profile_settings_username (username),
  CONSTRAINT fk_profile_settings_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_stories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  story_type ENUM('text','photo','video') NOT NULL DEFAULT 'text',
  caption VARCHAR(2000) NULL,
  media_path VARCHAR(500) NULL,
  media_mime VARCHAR(120) NULL,
  media_size_bytes BIGINT UNSIGNED NULL,
  visibility ENUM('everyone','contacts','close_friends','selected') NOT NULL DEFAULT 'contacts',
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_stories_feed (user_id, expires_at, deleted_at),
  KEY idx_stories_expiry (expires_at, deleted_at),
  CONSTRAINT fk_stories_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS story_views (
  story_id BIGINT UNSIGNED NOT NULL,
  viewer_user_id BIGINT UNSIGNED NOT NULL,
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (story_id, viewer_user_id),
  KEY idx_story_views_viewer (viewer_user_id, viewed_at),
  CONSTRAINT fk_story_views_story FOREIGN KEY (story_id) REFERENCES user_stories(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_story_views_viewer FOREIGN KEY (viewer_user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_messages (
  user_id BIGINT UNSIGNED NOT NULL,
  message_id BIGINT UNSIGNED NOT NULL,
  saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note VARCHAR(500) NULL,
  PRIMARY KEY (user_id, message_id),
  KEY idx_saved_messages_date (user_id, saved_at),
  CONSTRAINT fk_saved_messages_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_saved_messages_message FOREIGN KEY (message_id) REFERENCES messages(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_stars_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  delta BIGINT NOT NULL,
  reason ENUM('purchase','gift_received','gift_sent','admin_adjustment','refund','promo') NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id VARCHAR(120) NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stars_user_date (user_id, created_at),
  KEY idx_stars_reference (reference_type, reference_id),
  CONSTRAINT fk_stars_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_stars_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS premium_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_key VARCHAR(60) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  duration_days INT UNSIGNED NOT NULL,
  price_amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  features_json JSON NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_premium_plan_key (plan_key),
  KEY idx_premium_plans_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','active','expired','cancelled','refunded') NOT NULL DEFAULT 'pending',
  starts_at DATETIME NULL,
  expires_at DATETIME NULL,
  provider VARCHAR(60) NULL,
  provider_subscription_id VARCHAR(190) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_subscription_user_status (user_id, status, expires_at),
  KEY idx_subscription_provider (provider, provider_subscription_id),
  CONSTRAINT fk_subscription_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_subscription_plan FOREIGN KEY (plan_id) REFERENCES premium_plans(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_reference CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NULL,
  payment_purpose ENUM('premium','stars','gift','other') NOT NULL DEFAULT 'premium',
  provider VARCHAR(60) NOT NULL,
  provider_transaction_id VARCHAR(190) NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  status ENUM('created','pending','succeeded','failed','cancelled','refunded') NOT NULL DEFAULT 'created',
  idempotency_key VARCHAR(120) NULL,
  verified_at DATETIME NULL,
  provider_payload_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_public_reference (public_reference),
  UNIQUE KEY uq_payment_idempotency (user_id, idempotency_key),
  UNIQUE KEY uq_payment_provider_transaction (provider, provider_transaction_id),
  KEY idx_payment_user_status (user_id, status, created_at),
  CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_payment_plan FOREIGN KEY (plan_id) REFERENCES premium_plans(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider VARCHAR(60) NOT NULL,
  provider_event_id VARCHAR(190) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  signature_verified TINYINT(1) NOT NULL DEFAULT 0,
  processed_at DATETIME NULL,
  processing_status ENUM('received','processed','ignored','failed') NOT NULL DEFAULT 'received',
  payload_json JSON NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_webhook_event (provider, provider_event_id),
  KEY idx_webhook_processing (processing_status, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_media_library (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  source_type ENUM('chat_message','channel_post','story','profile','other') NOT NULL,
  source_id BIGINT UNSIGNED NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  checksum_sha256 CHAR(64) NULL,
  is_favourite TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_media_library_user (user_id, created_at),
  KEY idx_media_library_source (source_type, source_id),
  CONSTRAINT fk_media_library_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  action_key VARCHAR(120) NOT NULL,
  target_type VARCHAR(60) NULL,
  target_id VARCHAR(120) NULL,
  details_json JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_audit_actor (actor_user_id, created_at),
  KEY idx_admin_audit_target (target_type, target_id),
  CONSTRAINT fk_admin_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
