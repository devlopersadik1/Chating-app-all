-- Talviro Chat migration 0004
-- Admin-managed themes, user theme preferences, and feature configuration.
-- Apply after migrations 0001-0003. Back up the database first.
-- Store only safe theme metadata here. Theme assets should be uploaded to private/controlled
-- storage and served through validated paths; never store executable CSS/JS supplied by users.

CREATE TABLE IF NOT EXISTS app_themes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  theme_key VARCHAR(60) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  theme_mode ENUM('light','dark','system','custom') NOT NULL DEFAULT 'custom',
  palette_json JSON NOT NULL,
  asset_manifest_json JSON NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_app_themes_key (theme_key),
  KEY idx_app_themes_published (is_published, is_default),
  CONSTRAINT fk_app_themes_created_by FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_app_themes_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id BIGINT UNSIGNED NOT NULL,
  theme_id BIGINT UNSIGNED NULL,
  theme_mode ENUM('light','dark','system','custom') NOT NULL DEFAULT 'system',
  accent_color VARCHAR(20) NULL,
  chat_background_asset VARCHAR(500) NULL,
  language_code VARCHAR(12) NOT NULL DEFAULT 'en',
  notification_settings_json JSON NULL,
  privacy_settings_json JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_user_preferences_theme (theme_id),
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_preferences_theme FOREIGN KEY (theme_id) REFERENCES app_themes(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSON NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key),
  CONSTRAINT fk_app_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS external_integrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  integration_key VARCHAR(60) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  public_config_json JSON NULL,
  secret_reference VARCHAR(190) NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_external_integrations_key (integration_key),
  CONSTRAINT fk_external_integrations_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
