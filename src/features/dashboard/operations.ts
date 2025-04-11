import { HttpError } from 'wasp/server';
import type { Transaction, Envelope } from 'wasp/entities';
import type {
  GetDashboardTotals,
  GetSpendingByEnvelope,
} from 'wasp/server/operations';
import { TransactionType } from '@prisma/client'; // Import enum value

// Helper function to get start and end of the current month
const getCurrentMonthDateRange = () => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // End of the last day
  return { startDate, endDate };
};

type DashboardTotalsArgs = {
  budgetIds: string[];
};
type DashboardTotalsResult = {
  income: number;
  expense: number;
};

export const getDashboardTotals: GetDashboardTotals<
  DashboardTotalsArgs,
  DashboardTotalsResult
> = async ({ budgetIds }, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  // Basic check: ensure budgetIds is an array
  if (!Array.isArray(budgetIds)) {
     throw new HttpError(400, "budgetIds must be an array.")
  }
  // Prevent querying if no budgets are accessible
  if (budgetIds.length === 0) {
    return { income: 0, expense: 0 };
  }

  const { startDate, endDate } = getCurrentMonthDateRange();

  // Fetch relevant transactions within the date range for the specified budgets
  const transactions = await context.entities.Transaction.findMany({
    where: {
      budgetId: { in: budgetIds },
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
      type: true,
    },
  });

  let income = 0;
  let expense = 0;

  transactions.forEach((t) => {
    if (t.type === TransactionType.INCOME) {
      income += t.amount;
    } else if (t.type === TransactionType.EXPENSE) {
      expense += t.amount;
    }
  });

  return { income, expense };
};

type SpendingByEnvelopeArgs = {
  budgetIds: string[];
};
type SpendingByEnvelopeResult = Array<{
  name: string; // Envelope name
  total: number; // Total spending for this envelope
}>;

export const getSpendingByEnvelope: GetSpendingByEnvelope<
  SpendingByEnvelopeArgs,
  SpendingByEnvelopeResult
> = async ({ budgetIds }, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
   // Basic check: ensure budgetIds is an array
   if (!Array.isArray(budgetIds)) {
      throw new HttpError(400, "budgetIds must be an array.")
   }
  // Prevent querying if no budgets are accessible
  if (budgetIds.length === 0) {
    return [];
  }

  const { startDate, endDate } = getCurrentMonthDateRange();

  // Use Prisma groupBy to aggregate spending per envelope
  const spending = await context.entities.Transaction.groupBy({
    by: ['envelopeId'],
    _sum: {
      amount: true,
    },
    where: {
      budgetId: { in: budgetIds },
      type: TransactionType.EXPENSE, // Only expenses
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Get envelope details (names) for the aggregated results
  const envelopeIds = spending.map((s) => s.envelopeId).filter(id => id != null) as string[];
  if (envelopeIds.length === 0) {
    return []; // No spending found
  }

  const envelopes = await context.entities.Envelope.findMany({
    where: {
      id: { in: envelopeIds },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const envelopeMap = new Map(envelopes.map((e) => [e.id, e.name]));

  // Combine aggregation results with envelope names
  const result = spending.map((s) => ({
    name: envelopeMap.get(s.envelopeId as string) || 'Unknown Envelope',
    total: s._sum?.amount || 0,
  }));

  return result;
}; 