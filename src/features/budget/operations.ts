import { HttpError } from 'wasp/server'
import type {
  CreateEnvelope,
  GetEnvelopes,
  UpdateEnvelope,
  DeleteEnvelope,
  GetMyBudget,
} from 'wasp/server/operations'
import type { Envelope, Budget, User, Transaction, BudgetCollaborator } from 'wasp/entities'
import { TransactionType, CollaboratorRole } from '@prisma/client'

// Helper function to check user permission for a budget
async function checkBudgetPermission(
  context: any,
  userId: string,
  budgetId: string,
  allowedRoles: CollaboratorRole[] // e.g., [CollaboratorRole.OWNER, CollaboratorRole.EDITOR]
): Promise<void> {
  const budget = await context.entities.Budget.findUnique({
    where: { id: budgetId },
    select: { userId: true }, // Get the owner ID
  });

  if (!budget) {
    throw new HttpError(404, 'Budget not found.');
  }

  // Check if the user is the owner
  if (budget.userId === userId && allowedRoles.includes(CollaboratorRole.OWNER)) {
    return; // Owner has permission (if OWNER role is allowed)
  }

  // If not the owner, check collaboration status
  const collaboration = await context.entities.BudgetCollaborator.findUnique({
    where: {
      budgetId_userId: { budgetId: budgetId, userId: userId },
    },
    select: { role: true },
  });

  if (collaboration && allowedRoles.includes(collaboration.role)) {
    return; // Collaborator has required permission
  }

  // If neither owner nor collaborator with the required role
  throw new HttpError(403, 'User does not have sufficient permissions for this budget.');
}

type CreateEnvelopeInput = Pick<Envelope, 'name'> & { budgetId: string }; // Added budgetId to input

// Action to create a new Envelope for a specific budget
export const createEnvelope: CreateEnvelope<CreateEnvelopeInput, Envelope> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated')
  }

  const userId = context.user.id;
  const { budgetId, name } = args;

  // Check if user has EDITOR or OWNER permission for the target budget
  await checkBudgetPermission(context, userId, budgetId, [
    CollaboratorRole.OWNER,
    CollaboratorRole.EDITOR,
  ]);

  // Create the new envelope linked to the specified budget
  try {
    const newEnvelope = await context.entities.Envelope.create({
      data: {
        name: name,
        budgetId: budgetId,
      },
    });
    return newEnvelope;
  } catch (error) {
    console.error("Error creating envelope:", error);
    throw new HttpError(500, "Failed to create envelope.");
  }
}

// Define a new return type for getEnvelopes including summary and owner info
export type EnvelopeWithSummary = Envelope & {
  spent: number;
  remaining: number;
  budget: { // Include budget relation
    userId: string; // Include the owner's userId
  };
};

// Query to get all Envelopes for budgets the user has access to
export const getEnvelopes: GetEnvelopes<void, EnvelopeWithSummary[]> = async (
  _args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated')
  }

  const userId = context.user.id;

  // 1. Find all budget IDs the user owns or collaborates on
  const ownedBudgets = await context.entities.Budget.findMany({
    where: { userId: userId },
    select: { id: true },
  });
  const collaborations = await context.entities.BudgetCollaborator.findMany({
    where: { userId: userId },
    select: { budgetId: true },
  });

  const accessibleBudgetIds = [ 
    ...ownedBudgets.map(b => b.id),
    ...collaborations.map(c => c.budgetId)
  ];

  // Remove duplicates if user is both owner and collaborator (though shouldn't happen)
  const uniqueBudgetIds = [...new Set(accessibleBudgetIds)];

  if (uniqueBudgetIds.length === 0) {
    return []; // No accessible budgets
  }

  // 2. Find all envelopes linked to these accessible budgets, including budget owner ID
  const envelopes = await context.entities.Envelope.findMany({
    where: { budgetId: { in: uniqueBudgetIds } },
    include: {
      budget: { // Include the budget relation
        select: {
          userId: true // Select only the owner's ID
        }
      }
    },
    orderBy: { createdAt: 'asc' },
  });

  // 3. Find all EXPENSE transactions linked to these accessible budgets
  const expenses = await context.entities.Transaction.findMany({
    where: {
      budgetId: { in: uniqueBudgetIds }, // Use 'in' filter
      type: TransactionType.EXPENSE,
    },
    select: {
      amount: true,
      envelopeId: true,
    },
  });

  // 4. Calculate spent amount per envelope
  const spentPerEnvelope: Record<string, number> = {};
  for (const expense of expenses) {
    if (expense.envelopeId) { // Ensure envelopeId is not null
       spentPerEnvelope[expense.envelopeId] = (spentPerEnvelope[expense.envelopeId] || 0) + expense.amount;
    }
  }

  // 5. Combine envelope data with calculated summary
  const envelopesWithSummary = envelopes.map((envelope) => {
    const spent = spentPerEnvelope[envelope.id] || 0;
    const remaining = envelope.allocatedAmount - spent;
    return {
      ...envelope,
      spent,
      remaining,
    };
  });

  return envelopesWithSummary;
}

// Type definition for updateEnvelope input
type UpdateEnvelopeInput = { 
  id: string; 
  data: Partial<Pick<Envelope, 'name' | 'allocatedAmount'>>
}

// Action to update an Envelope
export const updateEnvelope: UpdateEnvelope<UpdateEnvelopeInput, Envelope> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated')
  }
  const userId = context.user.id;

  // Find the specific envelope to get its budgetId
  const envelope = await context.entities.Envelope.findUnique({
    where: { id: args.id },
    select: { id: true, budgetId: true }, // Need budgetId for permission check
  });

  if (!envelope) {
    throw new HttpError(404, 'Envelope not found');
  }

  // Check if user has EDITOR or OWNER permission for the envelope's budget
  await checkBudgetPermission(context, userId, envelope.budgetId, [
    CollaboratorRole.OWNER,
    CollaboratorRole.EDITOR,
  ]);

  // Update the envelope
  try {
    const updatedEnvelope = await context.entities.Envelope.update({
      where: { id: args.id },
      data: args.data,
    });
    return updatedEnvelope;
  } catch (error) {
    console.error("Error updating envelope:", error);
    throw new HttpError(500, "Failed to update envelope.");
  }
}

// Type definition for deleteEnvelope input
type DeleteEnvelopeInput = { id: string }

// Action to delete an Envelope
export const deleteEnvelope: DeleteEnvelope<DeleteEnvelopeInput, Envelope> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated')
  }
  const userId = context.user.id;

  // Find the specific envelope to get its budgetId
  const envelope = await context.entities.Envelope.findUnique({
    where: { id: args.id },
    select: { id: true, budgetId: true }, // Need budgetId for permission check
  });

  if (!envelope) {
    throw new HttpError(404, 'Envelope not found');
  }

  // Check if user has EDITOR or OWNER permission for the envelope's budget
  await checkBudgetPermission(context, userId, envelope.budgetId, [
    CollaboratorRole.OWNER,
    CollaboratorRole.EDITOR,
  ]);

  // Delete the envelope
  try {
    const deletedEnvelope = await context.entities.Envelope.delete({
      where: { id: args.id },
    });
    return deletedEnvelope;
  } catch (error) {
    console.error("Error deleting envelope:", error);
    throw new HttpError(500, "Failed to delete envelope.");
  }
}

// Query to fetch the current user's budget
export const getMyBudget: GetMyBudget<void, Budget | null> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const budget = await context.entities.Budget.findFirst({
    where: { userId: context.user.id },
    // Include other fields if needed, like name
    // select: { id: true, name: true } 
  });

  return budget; // Returns the budget object or null if not found (shouldn't happen after signup)
}; 