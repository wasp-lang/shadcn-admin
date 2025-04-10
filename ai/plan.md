# Collaborative Budgeting App Implementation Plan

This plan outlines the steps for building the application using a Milestone-Based approach combined with User Stories, suitable for LLM-assisted coding and a vertical slice methodology.

---

**Phase 1: Core Setup & Basic Budget Management (Envelopes)**

*   **Goal:** Establish user authentication, create the basic budget structure, and allow users to manage budget **Envelopes**.
*   **Steps/User Stories:**
    *   - [x] **1.1. Auth Setup:** Configure and verify Wasp's built-in Auth (Username/Password). Ensure users can sign up, log in, and log out. Define necessary fields (`email`, `hashedPassword`, etc.) implicitly via Wasp `auth` config or explicitly in `schema.prisma` if needed.
    *   - [x] **1.2. Budget Profile Entity:** Create a `Budget` entity in `schema.prisma` linked to the `User` (`userId`). Establish logic (perhaps in a user creation hook or first login action) to ensure each user is associated with *one* `Budget`.
    *   - [x] **1.3. Budget Envelope Entity:** Create an `Envelope` entity in `schema.prisma` linked to the `Budget` (`budgetId`). This represents a budget envelope. Include fields like `name` and potentially `allocatedAmount` (add allocation later).
    *   - [x] **1.4. CRUD Operations for Envelopes:** Implement Wasp actions and queries in `src/features/budget/operations.ts`:
        *   - [x] `createEnvelope(name: string)` - Creates a new budget envelope.
        *   - [x] `getEnvelopes()` - Returns envelopes for the logged-in user's budget.
        *   - [x] `updateEnvelope(id: int, name: string)` - (Stretch Goal for P1) Updates an envelope's name.
        *   - [x] `deleteEnvelope(id: int)` - (Stretch Goal for P1) Deletes an envelope.
    *   - [x] **1.5. Basic Budget UI (Envelope Management):** Create a `BudgetPage.tsx` page (`/budget`) in `src/features/budget/`. Use Shadcn-ui components to:
        *   - [x] Display the list of envelopes fetched by `getEnvelopes`.
        *   - [x] Provide a form/button to trigger the `createEnvelope` action (add a new envelope).
        *   - [x] Allow editing/deleting envelopes if those actions are implemented (Stretch Goal for P1).

---

**Phase 2: Manual Transaction Entry & Assignment to Envelopes**

*   **Goal:** Allow users to manually add income and expense transactions and assign them to specific **Envelopes**, and display calculated envelope summaries.
*   **Steps/User Stories:**
    *   - [ ] **2.1. Transaction Entity:** Define a `Transaction` entity in `schema.prisma` linked to `Budget` (`budgetId`) and `Envelope` (`envelopeId`). Include fields: `date` (DateTime), `description` (String), `amount` (Float or Decimal), `type` (Enum: `INCOME` | `EXPENSE`), `envelopeId` (linking to the envelope), `budgetId`. Define the `TransactionType` enum.
    *   - [ ] **2.2. CRUD Operations for Transactions:** Implement Wasp actions and queries in `src/features/transactions/operations.ts`:
        *   - [ ] `createTransaction(data: { date, description, amount, type, envelopeId })` - Ensure it associates with the correct budget and selected envelope.
        *   - [ ] `getTransactions()` - Return transactions for the user's budget, including envelope information.
        *   - [ ] `updateTransaction(...)` - (Stretch Goal for P2).
        *   - [ ] `deleteTransaction(...)` - (Stretch Goal for P2).
    *   - [ ] **2.3. Transaction Form UI:** Create a component `src/features/transactions/TransactionForm.tsx`. Use Shadcn-ui inputs:
        *   - [ ] DatePicker, Input (Description, Amount), Select (Type).
        *   - [ ] Select for **Envelope** populated using `getEnvelopes`.
        *   - [ ] Trigger `createTransaction` on submit.
    *   - [ ] **2.4. Transaction List UI:** Create a `TransactionsPage.tsx` page (`/transactions`) or integrate into `BudgetPage.tsx`. Use a Shadcn-ui Table to display transactions, including the assigned **Envelope**.
    *   - [ ] **2.5. Calculate and Display Envelope Summaries:**
        *   - [ ] Modify the `getEnvelopes` query (or create a new query/logic) to calculate the total amount spent (sum of expense transactions) for each envelope.
        *   - [ ] Update the `BudgetPage.tsx` UI (Envelope cards from Step 1.5) to display the calculated "Spent" amount and the derived "Remaining" amount (`allocated - spent`).

---

**Phase 3: Collaboration on Budgets & Envelopes**

*   **Goal:** Enable users to invite others to view and/or edit their budget, including its **Envelopes** and transactions.
*   **Steps/User Stories:**
    *   - [ ] **3.1. Collaboration Model:** Define the relationship in `schema.prisma`. A `BudgetCollaborator` join table linking `User` and `Budget`. Include a `role` (Enum: `OWNER` | `EDITOR` | `VIEWER`). Define the `CollaboratorRole` enum. Ensure the budget creator is added as `OWNER`.
    *   - [ ] **3.2. Invite/Manage Collaborators Actions:** Implement Wasp actions in `src/features/collaboration/operations.ts`:
        *   - [ ] `inviteCollaborator(budgetId: string, email: string, role: CollaboratorRole)`.
        *   - [ ] `removeCollaborator(budgetId: string, userId: string)`.
        *   - [ ] `updateCollaboratorRole(...)`.
    *   - [ ] **3.3. Modify Operations for Permissions:** Update all relevant queries and actions (`getEnvelopes`, `createEnvelope`, `createTransaction`, `getTransactions`, etc.) to check `context.user`'s permissions via `BudgetCollaborator` for the target `Budget`. Ensure users can only affect budgets/envelopes they have access to.
    *   - [ ] **3.4. Collaboration UI:** Add UI elements (e.g., on `BudgetPage.tsx` or settings):
        *   - [ ] For Owners: Invite by email, list collaborators, manage roles/remove.
        *   - [ ] Display shared budget/envelope information appropriately for collaborators.

---

**Phase 4: CSV Import & Mapping to Envelopes**

*   **Goal:** Allow users to upload transaction data via CSV files and map imported transactions to the correct **Envelopes**.
*   **Steps/User Stories:**
    *   - [ ] **4.1. CSV Upload UI:** Create a `CsvImportPage.tsx` page (`/import`) with a file input (`<input type="file" accept=".csv">`).
    *   - [ ] **4.2. CSV Parsing & Mapping UI:**
        *   - [ ] Parse CSV client-side (`papaparse`) or use an action for headers.
        *   - [ ] Display CSV headers.
        *   - [ ] Provide UI for user to map CSV columns to `Transaction` fields (Date, Description, Amount, Type). **Note:** Mapping directly to `Envelope` during import might be complex initially; consider a post-import step or assigning to a default "Inbox" envelope first. (Revisit this mapping strategy).
    *   - [ ] **4.3. Process Import Action:** Implement Wasp action `processImport(parsedData: object[], mapping: object)` in `src/features/import/operations.ts`:
        *   - [ ] Validate and transform data based on mapping.
        *   - [ ] Handle assigning transactions to a default envelope or based on user mapping if implemented in 4.2.
        *   - [ ] Consider duplicate checks.
        *   - [ ] Use `context.entities.Transaction.createMany(...)`.
        *   - [ ] Return summary/errors.
    *   - [ ] **4.4. Import Feedback UI:** Display results from `processImport` on `CsvImportPage.tsx`.

---
