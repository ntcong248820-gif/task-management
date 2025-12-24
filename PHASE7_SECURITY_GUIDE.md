# Phase 7 - Security Hardening Guide

**Goal:** Implement comprehensive security measures for production  
**Duration:** Days 5-7 of Week 1  
**Priority:** HIGH (Critical for production)

---

## 🔐 Security Checklist

### Critical (Must Have)
- [ ] OAuth token encryption
- [ ] Environment variable validation
- [ ] Rate limiting on API endpoints
- [ ] Request validation with Zod
- [ ] CORS configuration

### Important (Should Have)
- [ ] SQL injection prevention (Drizzle ORM handles this)
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Secure headers
- [ ] Input sanitization

### Nice to Have
- [ ] API key authentication
- [ ] Multi-user authentication
- [ ] Role-based access control
- [ ] Audit logging

---

## 1️⃣ OAuth Token Encryption

### Why It's Critical
Currently, OAuth tokens are stored in **plaintext** in the database. If the database is compromised, attackers can:
- Access user's Google Search Console data
- Access user's Google Analytics data
- Perform actions on behalf of the user

### Implementation

#### Step 1: Generate Encryption Key

```bash
# Generate a secure 32-byte encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env`:
```bash
ENCRYPTION_KEY=your_64_character_hex_string_here
```

#### Step 2: Create Encryption Utility

Create `apps/api/src/utils/encryption.ts`:
```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY not set in environment');
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 characters (32 bytes in hex)');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encrypt(text: string): string {
  if (!text) {
    throw new Error('Cannot encrypt empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string
 * @param encryptedText - Encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error('Cannot decrypt empty string');
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const [ivHex, authTagHex, encrypted] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a string is encrypted
 */
export function isEncrypted(text: string): boolean {
  const parts = text.split(':');
  return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
}
```

#### Step 3: Create Migration Script

Create `apps/api/src/scripts/migrate-tokens.ts`:
```typescript
import { db } from '@repo/db';
import { oauthTokens } from '@repo/db/schema';
import { encrypt, isEncrypted } from '../utils/encryption';
import { eq } from 'drizzle-orm';

/**
 * Migrate existing plaintext tokens to encrypted format
 */
async function migrateTokens() {
  console.log('🔐 Starting token encryption migration...');

  const tokens = await db.select().from(oauthTokens);
  console.log(`📊 Found ${tokens.length} tokens to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const token of tokens) {
    try {
      // Skip if already encrypted
      if (isEncrypted(token.accessToken)) {
        console.log(`⏭️  Token ${token.id} already encrypted, skipping`);
        skipped++;
        continue;
      }

      // Encrypt tokens
      const encryptedAccessToken = encrypt(token.accessToken);
      const encryptedRefreshToken = token.refreshToken 
        ? encrypt(token.refreshToken) 
        : null;

      // Update in database
      await db.update(oauthTokens)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
        })
        .where(eq(oauthTokens.id, token.id));

      console.log(`✅ Migrated token ${token.id} (${token.provider})`);
      migrated++;
    } catch (error) {
      console.error(`❌ Failed to migrate token ${token.id}:`, error);
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${tokens.length - migrated - skipped}`);
  console.log('\n✨ Migration complete!');
}

// Run migration
migrateTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

#### Step 4: Update Token Storage

Update `apps/api/src/routes/integrations/gsc.ts`:
```typescript
import { encrypt, decrypt } from '../../utils/encryption';

// When storing tokens
await db.insert(oauthTokens).values({
  provider: 'gsc',
  accessToken: encrypt(tokens.access_token),
  refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
  expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
});

// When retrieving tokens
const tokenRecord = await db.select().from(oauthTokens).where(...);
const accessToken = decrypt(tokenRecord.accessToken);
const refreshToken = tokenRecord.refreshToken ? decrypt(tokenRecord.refreshToken) : null;
```

#### Step 5: Update Token Refresh Utility

Update `apps/api/src/utils/token-refresh.ts`:
```typescript
import { encrypt, decrypt } from './encryption';

export async function refreshTokenIfNeeded(tokenId: number) {
  const [tokenRecord] = await db.select()
    .from(oauthTokens)
    .where(eq(oauthTokens.id, tokenId));

  if (!tokenRecord) {
    throw new Error('Token not found');
  }

  // Decrypt tokens
  const accessToken = decrypt(tokenRecord.accessToken);
  const refreshToken = tokenRecord.refreshToken ? decrypt(tokenRecord.refreshToken) : null;

  // Check if expired
  if (new Date() < tokenRecord.expiresAt) {
    return accessToken;
  }

  // Refresh token
  const newTokens = await refreshOAuthToken(refreshToken);

  // Encrypt and store new tokens
  await db.update(oauthTokens)
    .set({
      accessToken: encrypt(newTokens.access_token),
      refreshToken: newTokens.refresh_token ? encrypt(newTokens.refresh_token) : null,
      expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
    })
    .where(eq(oauthTokens.id, tokenId));

  return newTokens.access_token;
}
```

#### Step 6: Run Migration

```bash
cd apps/api
npx tsx src/scripts/migrate-tokens.ts
```

---

## 2️⃣ Environment Variable Validation

### Implementation

Create `apps/api/src/utils/env.ts`:
```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_REDIRECT_URI: z.string().url('GOOGLE_REDIRECT_URI must be a valid URL'),

  // Encryption
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 64 characters (32 bytes in hex)'),

  // Server
  API_PORT: z.string().regex(/^\d+$/, 'API_PORT must be a number').default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional
  OPENAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables on startup
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
  return result.data;
}
```

Update `apps/api/src/index.ts`:
```typescript
import { validateEnv } from './utils/env';

// Validate environment on startup
const env = validateEnv();

// Rest of your code...
```

---

## 3️⃣ Rate Limiting

### Implementation

Create `apps/api/src/middleware/rate-limit.ts`:
```typescript
import { Context, Next } from 'hono';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const requestCounts = new Map<string, RateLimitRecord>();

/**
 * Rate limiting middleware
 * @param maxRequests - Maximum requests allowed in the time window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || 
               c.req.header('x-real-ip') || 
               'unknown';
    
    const now = Date.now();
    const record = requestCounts.get(ip);

    // No record or window expired - create new record
    if (!record || now > record.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    // Check if limit exceeded
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      
      c.header('Retry-After', retryAfter.toString());
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', record.resetTime.toString());
      
      return c.json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      }, 429);
    }

    // Increment count
    record.count++;
    
    // Add rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    c.header('X-RateLimit-Reset', record.resetTime.toString());

    return next();
  };
}

/**
 * Cleanup expired records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 60000); // Cleanup every minute
```

### Usage

Update `apps/api/src/index.ts`:
```typescript
import { rateLimit } from './middleware/rate-limit';

// Apply rate limiting to all API routes
app.use('/api/*', rateLimit(100, 60000)); // 100 requests per minute

// Stricter rate limiting for auth endpoints
app.use('/api/integrations/*', rateLimit(10, 60000)); // 10 requests per minute
```

---

## 4️⃣ Request Validation with Zod

### Installation

```bash
cd apps/api
npm install zod
```

### Implementation

Create `apps/api/src/validators/task.ts`:
```typescript
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  status: z.enum(['todo', 'in-progress', 'done'], {
    errorMap: () => ({ message: 'Invalid status' }),
  }),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  projectId: z.number().int().positive('Invalid project ID'),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const taskIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});
```

Create `apps/api/src/validators/project.ts`:
```typescript
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color').optional(),
});

export const updateProjectSchema = createProjectSchema.partial();
```

### Validation Middleware

Create `apps/api/src/middleware/validate.ts`:
```typescript
import { Context, Next } from 'hono';
import { z } from 'zod';

/**
 * Validation middleware for request body
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const result = schema.safeParse(body);

      if (!result.success) {
        return c.json({
          error: 'Validation failed',
          details: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        }, 400);
      }

      // Store validated data in context
      c.set('validatedData', result.data);
      return next();
    } catch (error) {
      return c.json({ error: 'Invalid JSON' }, 400);
    }
  };
}

/**
 * Validation middleware for query parameters
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return async (c: Context, next: Next) => {
    const query = c.req.query();
    const result = schema.safeParse(query);

    if (!result.success) {
      return c.json({
        error: 'Validation failed',
        details: result.error.errors,
      }, 400);
    }

    c.set('validatedQuery', result.data);
    return next();
  };
}
```

### Usage in Routes

Update `apps/api/src/routes/tasks.ts`:
```typescript
import { validateBody } from '../middleware/validate';
import { createTaskSchema, updateTaskSchema } from '../validators/task';

// Create task with validation
app.post('/api/tasks', validateBody(createTaskSchema), async (c) => {
  const data = c.get('validatedData');
  
  const [task] = await db.insert(tasks).values(data).returning();
  return c.json(task);
});

// Update task with validation
app.put('/api/tasks/:id', validateBody(updateTaskSchema), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.get('validatedData');
  
  const [task] = await db.update(tasks)
    .set(data)
    .where(eq(tasks.id, id))
    .returning();
  
  return c.json(task);
});
```

---

## 5️⃣ CORS Configuration

### Implementation

Create `apps/api/src/middleware/cors.ts`:
```typescript
import { Context, Next } from 'hono';

const ALLOWED_ORIGINS = [
  'http://localhost:3002',
  'http://localhost:3000',
  process.env.FRONTEND_URL || '',
].filter(Boolean);

export async function cors(c: Context, next: Next) {
  const origin = c.req.header('origin');

  // Check if origin is allowed
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
  }

  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  return next();
}
```

Update `apps/api/src/index.ts`:
```typescript
import { cors } from './middleware/cors';

app.use('*', cors);
```

---

## 6️⃣ Security Headers

### Implementation

Create `apps/api/src/middleware/security-headers.ts`:
```typescript
import { Context, Next } from 'hono';

export async function securityHeaders(c: Context, next: Next) {
  // Prevent clickjacking
  c.header('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  c.header('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  c.header('Content-Security-Policy', "default-src 'self'");
  
  // Remove server header
  c.header('X-Powered-By', '');

  return next();
}
```

---

## 📋 Security Checklist

After implementing all security measures:

- [ ] Encryption key generated and stored securely
- [ ] All existing tokens migrated to encrypted format
- [ ] Environment variables validated on startup
- [ ] Rate limiting active on all API routes
- [ ] Request validation with Zod implemented
- [ ] CORS configured for allowed origins
- [ ] Security headers added
- [ ] `.env` files not committed to git
- [ ] `.env.example` updated with all required variables

---

## 🧪 Testing Security

### Test Token Encryption
```bash
cd apps/api
npx tsx src/scripts/test-encryption.ts
```

Create `apps/api/src/scripts/test-encryption.ts`:
```typescript
import { encrypt, decrypt } from '../utils/encryption';

const testToken = 'ya29.a0AfH6SMBxyz...';

console.log('Original:', testToken);

const encrypted = encrypt(testToken);
console.log('Encrypted:', encrypted);

const decrypted = decrypt(encrypted);
console.log('Decrypted:', decrypted);

console.log('Match:', testToken === decrypted ? '✅' : '❌');
```

### Test Rate Limiting
```bash
# Send 101 requests in 1 minute
for i in {1..101}; do
  curl http://localhost:3001/api/projects
done
```

---

**Status:** Ready to implement  
**Estimated Time:** 6-8 hours  
**Priority:** HIGH (Critical for production)
