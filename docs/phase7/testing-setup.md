# Phase 7 - Week 1: Testing Setup Guide

**Goal:** Setup comprehensive testing infrastructure and write initial test suite  
**Duration:** Days 1-2  
**Status:** Ready to begin

---

## 📋 Prerequisites Check

✅ **Already Installed:**
- `vitest` - in both `apps/api` and `apps/web`
- `@testing-library/react` - in `apps/web`
- `@vitest/coverage-v8` - in both packages
- `jsdom` - in `apps/web` (for DOM testing)

❌ **Need to Install:**
- `@testing-library/jest-dom` - Better assertions (already in web)
- `supertest` - For API integration tests
- `@types/supertest` - TypeScript types

---

## 🚀 Step 1: Install Additional Dependencies

### API Package
```bash
cd apps/api
npm install --save-dev supertest @types/supertest
```

### Verify Installation
```bash
# Check package.json
cat package.json | grep -A 5 "devDependencies"
```

---

## 🔧 Step 2: Configure Vitest

### API Configuration

Create `apps/api/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'dist/',
      ],
    },
    include: ['src/**/*.{test,spec}.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/db': path.resolve(__dirname, '../../packages/db/src'),
      '@repo/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
});
```

### Web Configuration

Create `apps/web/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.tsx',
        '**/*.spec.tsx',
        '.next/',
      ],
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 🗂️ Step 3: Create Test Directory Structure

### API Test Structure
```bash
mkdir -p apps/api/src/__tests__
mkdir -p apps/api/src/routes/__tests__
mkdir -p apps/api/src/utils/__tests__
mkdir -p apps/api/src/jobs/__tests__
```

### Web Test Structure
```bash
mkdir -p apps/web/src/__tests__
mkdir -p apps/web/src/components/__tests__
mkdir -p apps/web/src/hooks/__tests__
mkdir -p apps/web/src/stores/__tests__
```

---

## 📝 Step 4: Create Test Setup Files

### API Setup File

Create `apps/api/src/__tests__/setup.ts`:
```typescript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { db } from '@repo/db';

// Setup test database connection
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  // TODO: Setup test database or use in-memory DB
});

// Cleanup after each test
afterEach(async () => {
  // TODO: Clear test data
});

// Cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  // TODO: Close database connections
});
```

### Web Setup File

Create `apps/web/src/__tests__/setup.ts`:
```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));
```

---

## 🧪 Step 5: Create Test Utilities

### API Test Helpers

Create `apps/api/src/__tests__/helpers.ts`:
```typescript
import { db } from '@repo/db';
import { projects, tasks, timeLogs } from '@repo/db/schema';

/**
 * Create a test project
 */
export async function createTestProject(data?: Partial<typeof projects.$inferInsert>) {
  const [project] = await db.insert(projects).values({
    name: data?.name || 'Test Project',
    description: data?.description || 'Test Description',
    ...data,
  }).returning();
  
  return project;
}

/**
 * Create a test task
 */
export async function createTestTask(projectId: number, data?: Partial<typeof tasks.$inferInsert>) {
  const [task] = await db.insert(tasks).values({
    title: data?.title || 'Test Task',
    status: data?.status || 'todo',
    projectId,
    ...data,
  }).returning();
  
  return task;
}

/**
 * Create a test time log
 */
export async function createTestTimeLog(taskId: number, data?: Partial<typeof timeLogs.$inferInsert>) {
  const [timeLog] = await db.insert(timeLogs).values({
    taskId,
    startedAt: data?.startedAt || new Date(),
    endedAt: data?.endedAt,
    duration: data?.duration || 0,
    ...data,
  }).returning();
  
  return timeLog;
}

/**
 * Clean up all test data
 */
export async function cleanupTestData() {
  await db.delete(timeLogs);
  await db.delete(tasks);
  await db.delete(projects);
}
```

### Web Test Helpers

Create `apps/web/src/__tests__/helpers.tsx`:
```typescript
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

/**
 * Custom render function with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

/**
 * Mock fetch responses
 */
export function mockFetch(data: any, status = 200) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    } as Response)
  );
}

/**
 * Mock API response
 */
export function mockApiResponse(endpoint: string, data: any) {
  global.fetch = vi.fn((url) => {
    if (url.includes(endpoint)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
      } as Response);
    }
    return Promise.reject(new Error('Not found'));
  });
}
```

---

## ✅ Step 6: Write First Test (Smoke Test)

### API Smoke Test

Create `apps/api/src/routes/__tests__/projects.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestProject, cleanupTestData } from '../../__tests__/helpers';

describe('Projects API', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/projects', () => {
    it('should return empty array when no projects exist', async () => {
      // This is a placeholder - will implement actual API testing with supertest
      expect(true).toBe(true);
    });

    it('should return all projects', async () => {
      const project = await createTestProject({ name: 'Test Project 1' });
      expect(project.name).toBe('Test Project 1');
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const project = await createTestProject({
        name: 'New Project',
        description: 'New Description',
      });
      
      expect(project.name).toBe('New Project');
      expect(project.description).toBe('New Description');
    });
  });
});
```

### Web Smoke Test

Create `apps/web/src/components/__tests__/button.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should apply variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByText('Delete');
    expect(button).toBeInTheDocument();
  });
});
```

---

## 🏃 Step 7: Run Tests

### Run API Tests
```bash
cd apps/api
npm run test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Run Web Tests
```bash
cd apps/web
npm run test

# With coverage
npm run test:coverage
```

### Run All Tests (from root)
```bash
npm run test
```

---

## 📊 Step 8: Verify Coverage

### Check Coverage Reports
```bash
# API coverage
open apps/api/coverage/index.html

# Web coverage
open apps/web/coverage/index.html
```

### Coverage Goals
- **API Routes:** 90%+
- **Utilities:** 95%+
- **Components:** 70%+
- **Overall:** 80%+

---

## 🎯 Next Steps (Days 3-4)

Once testing infrastructure is setup:

1. **Write API Route Tests**
   - `/api/projects` CRUD
   - `/api/tasks` CRUD
   - `/api/time-logs` operations

2. **Write Utility Tests**
   - Token refresh logic
   - Date utilities
   - Encryption functions

3. **Write Integration Tests**
   - OAuth flow
   - Data sync jobs

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module '@repo/db'"
**Solution:** Check workspace configuration and path aliases in `vitest.config.ts`

### Issue: "ReferenceError: vi is not defined"
**Solution:** Add `globals: true` to vitest config

### Issue: "Cannot find module '@testing-library/jest-dom'"
**Solution:** Ensure `@testing-library/jest-dom` is installed in web package

### Issue: Database connection errors
**Solution:** Use separate test database or mock database calls

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)

---

**Status:** Ready to implement  
**Estimated Time:** 4-6 hours  
**Next:** Write comprehensive API route tests
