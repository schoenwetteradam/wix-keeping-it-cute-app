/**
 * Webhook Payload Validator
 * Validates and sanitizes incoming webhook payloads
 */

// Validation schemas for different webhook types
const webhookSchemas = {
  booking: {
    required: ['id'],
    optional: ['contactDetails', 'bookedEntity', 'status', 'paymentStatus', 'createdDate'],
    nested: {
      contactDetails: {
        optional: ['email', 'phone', 'firstName', 'lastName', 'contactId']
      },
      bookedEntity: {
        optional: ['title', 'slot']
      }
    }
  },
  contact: {
    required: ['id'],
    optional: ['info', 'createdDate', 'updatedDate'],
    nested: {
      info: {
        optional: ['name', 'emails', 'phones', 'addresses']
      }
    }
  },
  order: {
    required: ['id'],
    optional: ['number', 'status', 'buyerInfo', 'totals', 'lineItems', 'createdDate']
  },
  product: {
    required: ['id'],
    optional: ['name', 'description', 'price', 'stock', 'productType']
  },
  loyalty: {
    required: ['id'],
    optional: ['contactId', 'points', 'tier', 'createdDate']
  }
};

/**
 * Validate webhook payload against schema
 */
export function validateWebhookPayload(payload, type) {
  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      error: 'Invalid payload: must be an object'
    };
  }

  const schema = webhookSchemas[type];
  if (!schema) {
    // Unknown webhook type - allow but log
    console.warn(`No schema defined for webhook type: ${type}`);
    return { valid: true, sanitized: sanitizePayload(payload) };
  }

  // Check required fields
  for (const field of schema.required || []) {
    if (!(field in payload)) {
      return {
        valid: false,
        error: `Missing required field: ${field}`
      };
    }
  }

  return {
    valid: true,
    sanitized: sanitizePayload(payload)
  };
}

/**
 * Sanitize payload to prevent injection attacks
 */
export function sanitizePayload(payload) {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map(item => sanitizePayload(item));
  }

  if (typeof payload === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
      // Skip potentially dangerous keys
      if (key.startsWith('__') || key.includes('prototype')) {
        continue;
      }
      sanitized[sanitizeString(key)] = sanitizePayload(value);
    }
    return sanitized;
  }

  if (typeof payload === 'string') {
    return sanitizeString(payload);
  }

  return payload;
}

/**
 * Sanitize string values
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  // Remove null bytes
  str = str.replace(/\0/g, '');

  // Limit string length to prevent DoS
  const MAX_LENGTH = 10000;
  if (str.length > MAX_LENGTH) {
    str = str.substring(0, MAX_LENGTH);
  }

  return str;
}

/**
 * Extract entity from webhook payload
 */
export function extractWebhookEntity(webhookData) {
  // Handle different webhook formats
  if (webhookData.actionEvent?.body) {
    // Old format
    return webhookData.actionEvent.body;
  }

  if (webhookData.createdEvent?.entity) {
    // New format - created
    return webhookData.createdEvent.entity;
  }

  if (webhookData.updatedEvent?.currentEntity) {
    // New format - updated
    return webhookData.updatedEvent.currentEntity;
  }

  if (webhookData.deletedEvent?.entity) {
    // New format - deleted
    return webhookData.deletedEvent.entity;
  }

  // Direct entity
  return webhookData;
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Remove common formatting
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  // Check if it contains mostly digits
  return /^\+?\d{7,15}$/.test(cleaned);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate ISO date format
 */
export function isValidISODate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Safe JSON parse with size limit
 */
export function safeJSONParse(str, maxSize = 1024 * 1024) {
  if (typeof str !== 'string') return str;

  if (str.length > maxSize) {
    throw new Error(`JSON payload exceeds maximum size of ${maxSize} bytes`);
  }

  try {
    return JSON.parse(str);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

export default {
  validateWebhookPayload,
  sanitizePayload,
  extractWebhookEntity,
  isValidEmail,
  isValidPhone,
  isValidUUID,
  isValidISODate,
  safeJSONParse
};
