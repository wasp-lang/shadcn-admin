import { HttpError } from 'wasp/server';
import type {
  CreateTransaction,
  GetTransactions,
  UpdateTransaction,
  DeleteTransaction,
} from 'wasp/server/operations';
import type {
  Transaction,
  Envelope,
  Budget,
  User,
  BudgetCollaborator,
} from 'wasp/entities';
import { TransactionType, CollaboratorRole } from '@prisma/client';

// Helper function to check user permission for a budget (copied for now)
async function checkBudgetPermission(
  context: any,
  userId: string,
  budgetId: string,
  allowedRoles: CollaboratorRole[]
): Promise<void> {
  const budget = await context.entities.Budget.findUnique({
    where: { id: budgetId },
    select: { userId: true },
  });

  if (!budget) {
    throw new HttpError(404, 'Budget not found.');
  }

  if (budget.userId === userId && allowedRoles.includes(CollaboratorRole.OWNER)) {
    return;
  }

  const collaboration = await context.entities.BudgetCollaborator.findUnique({
    where: {
      budgetId_userId: { budgetId: budgetId, userId: userId },
    },
    select: { role: true },
  });

  if (collaboration && allowedRoles.includes(collaboration.role)) {
    return;
  }

  throw new HttpError(403, 'User does not have sufficient permissions for this budget.');
}

// Type definition for the input arguments of createTransaction
// Based on plan 2.1: { date, description, amount, type, envelopeId }
type CreateTransactionInput = {
  date: Date | string; // Allow string for flexibility, Prisma handles conversion
  description: string;
  amount: number;
  type: TransactionType; // Use the imported enum value
  envelopeId: string;
};

export const createTransaction: CreateTransaction<CreateTransactionInput, Transaction> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authorized');
  }
  const userId = context.user.id;
  const { envelopeId, ...restArgs } = args;

  // 1. Find the envelope to get the budgetId
  const envelope = await context.entities.Envelope.findUnique({
      where: { id: envelopeId },
      select: { id: true, budgetId: true }, // Need budgetId for permission check
  });

  if (!envelope) {
    throw new HttpError(404, 'Envelope not found.');
  }
  const budgetId = envelope.budgetId;

  // 2. Check permission for the budget associated with the envelope
  await checkBudgetPermission(context, userId, budgetId, [
    CollaboratorRole.OWNER,
    CollaboratorRole.EDITOR,
  ]);

  // 3. Create the transaction (use the validated budgetId)
  try {
    return await context.entities.Transaction.create({
      data: {
        ...restArgs, // Use remaining args (date, description, amount, type)
        date: new Date(args.date),
        envelopeId: envelopeId,
        budgetId: budgetId, // Associate with the envelope's budget
      },
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw new HttpError(500, "Failed to create transaction.");
  }
};

// Type alias for the return type of getTransactions for clarity
// Includes the related Envelope details
type TransactionWithEnvelope = Transaction & { envelope: Envelope };

// Query to get Transactions for budgets the user has access to
export const getTransactions: GetTransactions<void, TransactionWithEnvelope[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authorized');
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
    ...ownedBudgets.map((b) => b.id),
    ...collaborations.map((c) => c.budgetId),
  ];

  const uniqueBudgetIds = [...new Set(accessibleBudgetIds)];

  if (uniqueBudgetIds.length === 0) {
    return []; // No accessible budgets
  }

  // 2. Fetch transactions associated with the accessible budgets
  try {
    return await context.entities.Transaction.findMany({
      where: { budgetId: { in: uniqueBudgetIds } }, // Use 'in' filter
      include: {
        envelope: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  } catch (error) {
     console.error("Error fetching transactions:", error);
     throw new HttpError(500, "Failed to fetch transactions.");
  }
};

// Type definition for the input arguments of updateTransaction
type UpdateTransactionInputData = Partial<
  Pick<Transaction, 'date' | 'description' | 'amount' | 'type' | 'envelopeId'>
>;
type UpdateTransactionInput = { id: string; data: UpdateTransactionInputData };

export const updateTransaction: UpdateTransaction<UpdateTransactionInput, Transaction> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authorized');
  }
  const userId = context.user.id;

  // 1. Verify the transaction exists and get its budgetId
  const transaction = await context.entities.Transaction.findUnique({
    where: { id: args.id },
    select: { id: true, budgetId: true, envelopeId: true }, // Need budgetId and old envelopeId
  });

  if (!transaction) {
    throw new HttpError(404, 'Transaction not found.');
  }
  const budgetId = transaction.budgetId;

  // 2. Check permission for the transaction's budget
  await checkBudgetPermission(context, userId, budgetId, [
    CollaboratorRole.OWNER,
    CollaboratorRole.EDITOR,
  ]);

  // 3. If envelopeId is being updated, validate the new envelope belongs to the *same* budget
  if (args.data.envelopeId && args.data.envelopeId !== transaction.envelopeId) {
    const newEnvelope = await context.entities.Envelope.findFirst({
      where: {
        id: args.data.envelopeId,
        budgetId: budgetId, // Ensure new envelope is in the same budget
      },
    });
    if (!newEnvelope) {
      throw new HttpError(400, 'Invalid new Envelope ID for this budget.');
    }
  }

  // 4. Perform the update
  try {
    const updateData = { ...args.data };
    if (updateData.date && typeof updateData.date === 'string') {
      updateData.date = new Date(updateData.date);
    }

    return await context.entities.Transaction.update({
      where: { id: args.id },
      data: updateData,
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw new HttpError(500, "Failed to update transaction.");
  }
};

// Type definition for the input arguments of deleteTransaction
type DeleteTransactionInput = { id: string };

export const deleteTransaction: DeleteTransaction<DeleteTransactionInput, Transaction> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authorized');
  }
  const userId = context.user.id;

  // 1. Verify the transaction exists and get its budgetId
  const transaction = await context.entities.Transaction.findUnique({
    where: { id: args.id },
    select: { id: true, budgetId: true }, // Need budgetId for permission check
  });

  if (!transaction) {
    throw new HttpError(404, 'Transaction not found.');
  }
  const budgetId = transaction.budgetId;

  // 2. Check permission for the transaction's budget
  await checkBudgetPermission(context, userId, budgetId, [
    CollaboratorRole.OWNER,
    CollaboratorRole.EDITOR,
  ]);

  // 3. Perform the deletion
  try {
    return await context.entities.Transaction.delete({
      where: { id: args.id },
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw new HttpError(500, "Failed to delete transaction.");
  }
}; 