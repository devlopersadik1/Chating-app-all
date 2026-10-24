-- Talviro Chat migration 0005
-- Telegram-style channels, public/private group spaces, post engagement and sponsored placements.
-- Apply only after checking the live schema and taking a verified backup.

CREATE TABLE IF NOT EXISTS channels (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  username VARCHAR(40) NULL,
  description VARCHAR(1000) NULL,
  avatar_path VARCHAR(500) NULL,
  cover_path VARCHAR(500) NULL,
  space_type ENUM('channel','group') NOT NULL,
  visibility ENUM('public','private') NOT NULL DEFAULT 'public',
  join_approval_required TINYINT(1) NOT NULL DEFAULT 0,
  posting_permission ENUM('admins_only','members') NOT NULL DEFAULT 'admins_only',
  member_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active','restricted','deleted') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_channels_username (username),
  KEY idx_channels_discovery (space_type, visibility, status, member_count),
  KEY idx_channels_owner (owner_user_id, status),
  CONSTRAINT fk_channels_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_members (
  channel_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  member_role ENUM('owner','admin','moderator','member','subscriber') NOT NULL DEFAULT 'member',
  membership_status ENUM('active','pending','banned','left') NOT NULL DEFAULT 'active',
  notifications_enabled TINYINT(1) NOT NULL DEFAULT 1,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel_id, user_id),
  KEY idx_channel_members_user (user_id, membership_status),
  KEY idx_channel_members_role (channel_id, member_role, membership_status),
  CONSTRAINT fk_channel_members_channel FOREIGN KEY (channel_id) REFERENCES channels(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_channel_members_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel_id BIGINT UNSIGNED NOT NULL,
  author_user_id BIGINT UNSIGNED NOT NULL,
  post_type ENUM('text','photo','video','file','voice','poll','system') NOT NULL DEFAULT 'text',
  body TEXT NULL,
  media_path VARCHAR(500) NULL,
  media_mime VARCHAR(120) NULL,
  media_size_bytes BIGINT UNSIGNED NULL,
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  comments_enabled TINYINT(1) NOT NULL DEFAULT 1,
  views_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  edit_at DATETIME NULL,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_channel_posts_feed (channel_id, deleted_at, id),
  KEY idx_channel_posts_author (author_user_id, created_at),
  CONSTRAINT fk_channel_posts_channel FOREIGN KEY (channel_id) REFERENCES channels(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_channel_posts_author FOREIGN KEY (author_user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_post_views (
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  KEY idx_post_views_user (user_id, viewed_at),
  CONSTRAINT fk_post_views_post FOREIGN KEY (post_id) REFERENCES channel_posts(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_views_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_post_reactions (
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  reaction VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id, reaction),
  KEY idx_post_reactions_post (post_id, reaction),
  CONSTRAINT fk_post_reactions_post FOREIGN KEY (post_id) REFERENCES channel_posts(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_reactions_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_post_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  reply_to_comment_id BIGINT UNSIGNED NULL,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_post_comments (post_id, deleted_at, id),
  CONSTRAINT fk_post_comments_post FOREIGN KEY (post_id) REFERENCES channel_posts(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_comments_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_comments_reply FOREIGN KEY (reply_to_comment_id) REFERENCES channel_post_comments(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sponsored placements are a separate system from ordinary channel posts.
-- Only approved campaigns should be eligible for delivery.
CREATE TABLE IF NOT EXISTS sponsored_campaigns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  advertiser_user_id BIGINT UNSIGNED NULL,
  campaign_name VARCHAR(160) NOT NULL,
  destination_url VARCHAR(1000) NOT NULL,
  creative_text VARCHAR(500) NOT NULL,
  creative_media_path VARCHAR(500) NULL,
  placement ENUM('channel_feed_top','channel_feed_bottom','home_feed') NOT NULL DEFAULT 'channel_feed_bottom',
  status ENUM('draft','pending_review','approved','paused','rejected','ended') NOT NULL DEFAULT 'draft',
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  budget_amount DECIMAL(12,2) NULL,
  budget_currency CHAR(3) NOT NULL DEFAULT 'USD',
  impression_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  click_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sponsored_delivery (status, placement, starts_at, ends_at),
  KEY idx_sponsored_advertiser (advertiser_user_id, status),
  CONSTRAINT fk_sponsored_advertiser FOREIGN KEY (advertiser_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_sponsored_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsored_impressions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  campaign_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  event_type ENUM('impression','click') NOT NULL,
  placement VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sponsored_events_campaign (campaign_id, event_type, created_at),
  KEY idx_sponsored_events_user (user_id, created_at),
  CONSTRAINT fk_sponsored_events_campaign FOREIGN KEY (campaign_id) REFERENCES sponsored_campaigns(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sponsored_events_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
