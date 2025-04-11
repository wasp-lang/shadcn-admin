# Phase 3: Collaboration on Budgets & Envelopes

**Goal:** Enable users to invite others to view and/or edit their budget, including its **Envelopes** and transactions.

**1. Schema Modifications (`schema.prisma`):**

*   Added `CollaboratorRole` enum (`OWNER`, `EDITOR`, `VIEWER`).
*   Added `BudgetCollaborator` model to link `User` and `Budget`.
    *   Includes fields: `userId`, `budgetId`, `role` (`CollaboratorRole`).
    *   Composite key defined: `@@id([userId, budgetId])`.
    *   Relations updated in `User` and `Budget` models.
*   Database migrated successfully (`wasp db migrate-dev`).

**2. Collaboration Actions (`src/features/collaboration/operations.ts`):**

*   Implemented Wasp actions:
    *   `inviteCollaborator(budgetId: string, inviteeUserId: string, role: CollaboratorRole)`: Invites a user to a budget. Includes checks:
        *   Inviter must be the OWNER.
        *   Cannot invite self.
        *   Invitee must exist.
        *   Invitee must not already be a collaborator.
    *   `removeCollaborator(budgetId: string, userIdToRemove: string)`: Removes a collaborator. Includes checks:
        *   Remover must be the OWNER.
        *   Cannot remove the OWNER.
    *   `updateCollaboratorRole(budgetId: string, collaboratorUserId: string, newRole: CollaboratorRole)`: Updates a collaborator's role. Includes checks:
        *   Updater must be the OWNER.
        *   Cannot change the OWNER's role.
        *   New role must be `EDITOR` or `VIEWER`.

**3. Backend Queries (`src/features/collaboration/operations.ts` & `src/features/budget/operations.ts`):**

*   Implemented Wasp queries:
    *   `findUserByEmail(email: string)`: Finds a user by email (used for invites).
    *   `getBudgetCollaborators(budgetId: string)`: Fetches collaborators for a specific budget, including their user details (email).
    *   `getMyBudget()`: Fetches the budget owned by the current user (used to reliably get `budgetId` for UI actions).

**4. Permission Logic:**

*   **Entity Access:** Added `BudgetCollaborator` entity access to relevant queries/actions in `main.wasp`.
*   **Read Operations:**
    *   Modified `getEnvelopes` and `getTransactions` to return data for all budgets the user either owns or is a collaborator on.
*   **Write Operations:**
    *   Created a helper function `checkBudgetPermission(args, context, requiredRole: CollaboratorRole[])` in `src/features/collaboration/operations.ts`.
    *   Integrated `checkBudgetPermission` into all write operations (`create/update/deleteEnvelope`, `create/update/deleteTransaction`) to ensure the user has the required role (`OWNER` or `EDITOR`) for the target budget.

**5. Collaboration UI (`src/features/budget/BudgetPage.tsx`):**

*   Integrated collaboration features directly into the `BudgetPage`.
*   Added a "Collaborators" card/section visible only to the budget OWNER.
*   **Invite Feature:**
    *   "Invite Collaborator" button triggers a modal (`InviteCollaboratorModal.tsx`).
    *   Modal includes:
        *   Email input.
        *   "Find User" button (calls `findUserByEmail` query directly).
        *   Displays found user's email (hides ID).
        *   Role selection (`EDITOR`/`VIEWER`).
        *   "Send Invite" button (calls `inviteCollaborator` action).
*   **Collaborator List:**
    *   Displays current collaborators (fetched via `getBudgetCollaborators`) with their email and role.
*   **Manage Collaborators:**
    *   "Edit Role" button per collaborator triggers a modal (`EditRoleModal.tsx`) allowing role change via `updateCollaboratorRole`.
    *   "Remove" button per collaborator triggers a confirmation dialog (`RemoveCollaboratorDialog.tsx`) using `removeCollaborator`.

**6. Bug Fixes & Refinements:**

*   **Permission Errors:** Resolved `TypeError: Cannot read properties of undefined (reading 'findUnique')` in `checkBudgetPermission` by adding `BudgetCollaborator` entity access to `updateEnvelope`/`deleteEnvelope` actions in `main.wasp`.
*   **Client Enum Error:** Fixed `TypeError: Cannot read properties of undefined (reading 'VIEWER')` on the client by using string literals (e.g., `'VIEWER'`) instead of Prisma enums (`CollaboratorRole.VIEWER`) in React component state and props.
*   **Add Envelope Bug:** Fixed the "Add Envelope" button not working for newly signed-up users by introducing and using the `getMyBudget` query to reliably get the user's `budgetId`.
*   **Visual Distinction:**
    *   Modified `getEnvelopes` query to include the `ownerId` for each budget.
    *   Added a "Shared" `Badge` component to Envelope cards in `BudgetPage.tsx` when the current `userId` does not match the `ownerId`.

--- 