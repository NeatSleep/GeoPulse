const redis = require("../config/redis.js");
const logger = require("../utils/logger.js");

const MAIN_KEY = "geopolitics_events";
const BACKUP_KEY = "geopolitics_events_backup";

const TTL = 600; // 10 minutes (matches cron job schedule)

exports.getCache = async () => {
  try {
    logger.info("Checking Redis cache...", "cache");

    const data = await redis.get(MAIN_KEY);

    if (data) {
      logger.info("Cache hit (main)", "cache");
      return JSON.parse(data);
    }

    logger.warn("Main cache miss, checking backup...", "cache");

    const backup = await redis.get(BACKUP_KEY);

    if (backup) {
      logger.warn("Serving backup cache", "cache");
      return JSON.parse(backup);
    }

    logger.warn("No cache available", "cache");

    return null;
  } catch (err) {
    logger.error(`Redis GET error: ${err.message}`, "cache");
    return null;
  }
};

exports.setCache = async (data) => {
  try {
    logger.info("Updating Redis cache...", "cache");

    const json = JSON.stringify(data);

    // Main cache with expiry
    await redis.set(MAIN_KEY, json, "EX", TTL);

    // Backup cache (no expiry)
    await redis.set(BACKUP_KEY, json);

    logger.info("Cache updated successfully", "cache");
  } catch (err) {
    logger.error(`Redis SET error: ${err.message}`, "cache");
  }
};