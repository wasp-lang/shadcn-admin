# Budget & Envelope Management

**Phase:** 1 (Core Setup & Basic Budget Management)

## Overview

This feature allows users to manage their budget structure through **Envelopes**. Each user is automatically associated with a single **Budget** upon signup. Users can create, view, update (name and allocated amount), and delete these envelopes.

The system also calculates summary information for each envelope based on associated transactions.

## Data Models (`schema.prisma`)

### `Budget` Model

Represents the overall budget container for a user.

```prisma
model Budget {
  id        String   @id @default(uuid())
  name      String   @default("My Budget")
  userId    String   // Foreign key to the owner
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  envelopes   Envelope[]
  transactions Transaction[]
  // collaborators BudgetCollaborator[] // To be added in Phase 3
}
```

- **Key Logic:** The `handleNewUserSignup` server hook ensures every new `User` gets one associated `Budget` automatically.

### `Envelope` Model

Represents a specific spending category or "envelope".

```prisma
model Envelope {
  id        String   @id @default(uuid())
  name      String
  budgetId  String   // Foreign key to Budget
  budget    Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)

  allocatedAmount Float @default(0.0) // Planned amount for this envelope

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  transactions Transaction[]
}
```

## Operations (`src/features/budget/operations.ts`)

### `action createEnvelope`

- **Input:** `{ name: string }`
- **Output:** `Envelope`
- **Logic:** Creates a new `Envelope` linked to the authenticated user's `Budget`. Throws `HttpError(401)` if not authenticated.

### `query getEnvelopes`

- **Input:** `void`
- **Output:** `EnvelopeWithSummary[]`
  ```typescript
  type EnvelopeWithSummary = Envelope & {
    spent: number; // Sum of all EXPENSE transactions linked to this envelope
    remaining: number; // calculated as allocatedAmount - spent
  };
  ```
- **Logic:** Fetches all envelopes for the authenticated user's budget. Calculates the total `spent` amount by summing associated `EXPENSE` transactions. Derives the `remaining` amount. Returns an empty array if the user has no budget. Throws `HttpError(401)` if not authenticated.
- **Dependencies:** `User`, `Budget`, `Envelope`, `Transaction`

### `action updateEnvelope`

- **Input:** `{ id: string, data: { name?: string, allocatedAmount?: number } }`
- **Output:** `Envelope`
- **Logic:** Updates the `name` and/or `allocatedAmount` of the specified envelope. Verifies the envelope exists and belongs to the authenticated user's budget. Throws `HttpError(401)` if not authenticated, `HttpError(404)` if not found, `HttpError(403)` if not authorized.

### `action deleteEnvelope`

- **Input:** `{ id: string }`
- **Output:** `Envelope` (the deleted envelope)
- **Logic:** Deletes the specified envelope. Verifies the envelope exists and belongs to the authenticated user's budget. Throws `HttpError(401)` if not authenticated, `HttpError(404)` if not found, `HttpError(403)` if not authorized.

## User Workflows / UI (`src/features/budget/BudgetPage.tsx`)

- **Location:** `/budget`
- **Access:** Authenticated users only.
- **Functionality:**
    - Displays a list of the user's envelopes as cards (`Card` component).
    - Each card shows:
        - Envelope Name
        - Allocated Amount (formatted currency)
        - Spent Amount (formatted currency, calculated by `getEnvelopes`)
        - Remaining Amount (formatted currency, calculated by `getEnvelopes`, styled red if negative)
        - Progress Bar (`Progress` component) visualizing Spent vs. Allocated (turns red if over budget).
        - Edit (`Pencil` icon) and Delete (`Trash2` icon) buttons.
    - Provides an input field and button (`Add Envelope`) to create new envelopes (`createEnvelope` action).
    - Clicking the Edit button opens a modal (`Dialog`) allowing the user to update the envelope's `name` and `allocatedAmount` (`updateEnvelope` action).
    - Clicking the Delete button opens a confirmation dialog (`ConfirmDialog`) before deleting the envelope (`deleteEnvelope` action).

## Server Hooks (`src/server/hooks.ts`)

### `onAfterSignup: handleNewUserSignup`

- **Trigger:** After a new user successfully signs up via any auth method.
- **Logic:** Creates a `Budget` record automatically linked to the newly created `User` (`context.entities.Budget.create(...)`). Ensures every user starts with a budget container. 