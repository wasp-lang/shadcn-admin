# Transaction Management

**Phase:** 2 (Manual Transaction Entry & Assignment)

## Overview

This feature enables users to manually record their income and expenses (**Transactions**) and assign each transaction to a specific budget **Envelope**. It builds upon the Budget & Envelope management feature.

## Data Models (`schema.prisma`)

### `Transaction` Model

Represents a single financial transaction (income or expense).

```prisma
model Transaction {
  id          String   @id @default(uuid())
  date        DateTime
  description String
  amount      Float
  type        TransactionType // Enum: INCOME | EXPENSE

  envelopeId String
  envelope   Envelope @relation(fields: [envelopeId], references: [id], onDelete: Cascade)

  budgetId String
  budget   Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### `TransactionType` Enum

Defines the possible types for a transaction.

```prisma
enum TransactionType {
  INCOME
  EXPENSE
}
```

## Operations (`src/features/transactions/operations.ts`)

### `action createTransaction`

- **Input:** `{ date: Date | string, description: string, amount: number, type: TransactionType, envelopeId: string }`
- **Output:** `Transaction`
- **Logic:** Creates a new transaction. Verifies the user is authenticated, finds their budget, and validates that the provided `envelopeId` belongs to that budget. Associates the transaction with both the budget and the envelope. Throws `HttpError(401)` if not authenticated, `HttpError(404)` if budget not found, `HttpError(400)` if invalid envelope ID.

### `query getTransactions`

- **Input:** `void`
- **Output:** `TransactionWithEnvelope[]`
  ```typescript
  type TransactionWithEnvelope = Transaction & { envelope: Envelope };
  ```
- **Logic:** Fetches all transactions associated with the authenticated user's budget. Includes the related `Envelope` data for each transaction. Orders transactions by date descending. Returns an empty array if the user has no budget. Throws `HttpError(401)` if not authenticated.

### `action updateTransaction`

- **Input:** `{ id: string, data: Partial<Pick<Transaction, 'date' | 'description' | 'amount' | 'type' | 'envelopeId'>> }`
- **Output:** `Transaction`
- **Logic:** Updates the specified transaction fields. Verifies the user is authenticated and owns the transaction (via budget check). If `envelopeId` is changed, validates the new envelope also belongs to the user's budget. Throws `HttpError(401)` if not authenticated, `HttpError(404)` if budget/transaction not found or access denied, `HttpError(400)` if invalid new envelope ID.

### `action deleteTransaction`

- **Input:** `{ id: string }`
- **Output:** `Transaction` (the deleted transaction)
- **Logic:** Deletes the specified transaction. Verifies the user is authenticated and owns the transaction (via budget check). Throws `HttpError(401)` if not authenticated, `HttpError(404)` if budget/transaction not found or access denied.

## User Workflows / UI (`src/features/transactions/TransactionsPage.tsx`)

- **Location:** `/transactions`
- **Access:** Authenticated users only.
- **Functionality:**
    - Displays a header with search, theme switch, and profile dropdown.
    - Displays a title and an "Add Transaction" button.
    - Clicking "Add Transaction" opens a modal (`TransactionModal`) containing the `TransactionForm`.
    - Renders a list of transactions in a table (`Table` component) within a card (`Card`).
    - Table columns: Date, Description, Envelope Name, Type (styled `Badge`), Amount (formatted currency, colored green/red), Actions.
    - Each transaction row has:
        - Edit button (`Pencil` icon): Opens the `TransactionModal` pre-filled with the transaction data for editing (`updateTransaction` action).
        - Delete button (`Trash2` icon): Opens a confirmation dialog (`DeleteTransactionDialog`) before deleting (`deleteTransaction` action).

### Supporting Components

- **`src/features/transactions/TransactionForm.tsx`**: Reusable form (using `react-hook-form` and Zod validation) for creating and editing transactions. Includes fields for date (DatePicker), description (Input), amount (Input type number), type (Select: INCOME/EXPENSE), and envelope (Select populated by `getEnvelopes`). Handles submission logic via `createTransaction` or `updateTransaction`.
- **`src/features/transactions/TransactionModal.tsx`**: Wrapper component using Shadcn `Dialog` to display the `TransactionForm` for adding or editing.
- **`src/features/transactions/DeleteTransactionDialog.tsx`**: Wrapper component using Shadcn `AlertDialog` to confirm transaction deletion before calling `deleteTransaction`.

## Impact on Other Features

- **Budget Summaries (`BudgetPage.tsx` & `getEnvelopes` query):** The `getEnvelopes` query now sums `EXPENSE` type transactions linked to each envelope to calculate the `spent` and `remaining` values displayed on the `BudgetPage`. 