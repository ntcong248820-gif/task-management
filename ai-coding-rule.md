# AI Coding Rules

> **Purpose:** Strict guidelines for AI assistants when generating code for this project  
> **Enforcement:** MANDATORY - All generated code must follow these rules  
> **Last Updated:** December 2024

---

## 🎯 Core Principles

### 1. **Follow Best Practices**
- Use established patterns from Next.js, React, and TypeScript communities
- Leverage built-in framework features over custom solutions
- Write self-documenting code with clear naming conventions
- Follow SOLID principles where applicable

**Fix ALL warnings before considering code complete:**
- No unused variables
- No unused imports
- No missing dependencies in hooks
- No console.log in production code (use logger)

---

## 🏗️ Modular Architecture

### 2. **Component Design Principles**

**Component Hierarchy:**
- **Atoms:** Basic UI elements (Button, Input, Badge)
- **Molecules:** Simple combinations (FormField, SearchBar)
- **Organisms:** Complex components (TaskCard, TimerWidget)
- **Templates:** Page layouts (DashboardLayout, KanbanBoard)

**Modular Rules:**
1. **Single Responsibility:** Each component does ONE thing well
2. **Reusability:** Design for reuse, not one-off solutions
3. **Composition over Inheritance:** Combine small components
4. **Props Interface:** Clear, typed props with defaults
5. **No Business Logic in UI:** Move logic to hooks/stores

**File Organization:**
```
components/
  ├── ui/              # shadcn/ui base components
  ├── forms/           # Form-related components
  ├── layouts/         # Layout components
  └── features/        # Feature-specific components
      ├── tasks/
      │   ├── TaskCard.tsx
      │   ├── TaskDialog.tsx
      │   └── TaskFilters.tsx
      └── timer/
          └── TimerWidget.tsx
```

**Component Template:**
```typescript
// 1. Imports grouped by category
import { useState } from 'react';           // React
import { Button } from '@/components/ui';   // UI components
import { useTaskStore } from '@/stores';    // State
import type { Task } from '@/types';        // Types

// 2. Props interface with JSDoc
interface TaskDialogProps {
  /** Current mode: create or edit */
  mode: 'create' | 'edit';
  /** Task data for edit mode */
  task?: Task;
  /** Callback when dialog closes */
  onClose: () => void;
}

// 3. Component with clear structure
export function TaskDialog({ mode, task, onClose }: TaskDialogProps) {
  // 3a. Hooks first
  const [isLoading, setIsLoading] = useState(false);
  
  // 3b. Derived state
  const isEditMode = mode === 'edit';
  
  // 3c. Event handlers
  const handleSubmit = async () => {
    // Implementation
  };
  
  // 3d. Render
  return (
    // JSX
  );
}
```

**Anti-Patterns to AVOID:**
- ❌ God components (>300 lines)
- ❌ Prop drilling (use context/store)
- ❌ Inline styles (use Tailwind classes)
- ❌ Anonymous functions in JSX (define handlers)
- ❌ Mixing concerns (UI + API + business logic)

### 3. **Code Reusability**

**DRY Principle:**
- Extract common logic into hooks
- Create base components for variations
- Use composition for flexibility

**Example:**
```typescript
// ❌ BAD: Duplicate code
function NewTaskDialog() { /* form logic */ }
function EditTaskDialog() { /* same form logic */ }

// ✅ GOOD: Shared base component
function TaskDialog({ mode, task }: TaskDialogProps) {
  // Shared logic handles both create and edit
}
```

**Custom Hooks Pattern:**
```typescript
// ✅ Extract reusable logic
function useTaskForm(mode: 'create' | 'edit', initialTask?: Task) {
  const [formData, setFormData] = useState(initialTask || defaultTask);
  const [errors, setErrors] = useState({});
  
  const validate = () => { /* validation logic */ };
  const handleSubmit = async () => { /* submit logic */ };
  
  return { formData, errors, validate, handleSubmit };
}
```

---

## 🔄 Rebuild & Restart Protocol

### 6. **Cache Invalidation - CRITICAL**

**When to rebuild:**
- After schema changes
- After environment variable changes
- After dependency updates
- When encountering weird errors

**Standard procedure:**

```bash
# 1. Stop dev server (Ctrl+C)

# 2. Delete cache
rm -rf .next

# 3. (Optional) Delete node_modules if dependency issues
rm -rf node_modules
npm install

# 4. Rebuild
npm run build

# 5. Restart dev server
npm run dev

# 6. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
```

**Common scenarios requiring rebuild:**

| Scenario | Action |
|----------|--------|
| Schema change | `npm run db:generate && npm run db:migrate && rm -rf .next && npm run dev` |
| New env var | `rm -rf .next && npm run dev` |
| Type errors after pull | `rm -rf node_modules && npm install && npm run dev` |
| Random build error | `rm -rf .next && npm run build` |

---

## 🧪 Testing Rules

### 7. **Unit Testing - REQUIRED**

**Test Coverage Requirements:**
- Utility functions: **100%**
- Database queries: **90%+**
- Server Actions: **80%+**
- Components: **70%+**

## 🚀 Generation Strategy

### 8. **"No Lazy Coding" Policy (Unlimited Tokens)**

**Mandate:**
You must prioritize **COMPLETENESS** over brevity. Do not worry about token limits or response length.

**Strict Prohibitions:**
- ❌ **NEVER** use placeholders like `// ... rest of code`, `// ... existing code`, or `// ... implement logic here`.
- ❌ **NEVER** summarize logic that should be implemented.
- ❌ **NEVER** leave "TODOs" for core functionality requested in the prompt.

**Operational Rules:**
1.  **Full Implementation:** Always generate the **entire file content** unless explicitly asked for a snippet. If modifying a file, output the full updated file to ensure copy-paste reliability.
2.  **Hit the Limit?** If the code is too long for a single response:
    -   **DO NOT** abbreviate to fit.
    -   **DO NOT** cut corners.
    -   **Action:** Output as much as possible, stop cleanly, and explicitly ask the user to type "Continue" to generate the rest.
3.  **Complex Logic:** If a function is complex, write out every single line of logic, error handling, and edge case management. Do not simplify for the sake of saving tokens.

**Mantra:** "Write code as if you are deploying to production immediately. No placeholders, no shortcuts."