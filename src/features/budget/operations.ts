import { HttpError } from 'wasp/server'
import type { CreateEnvelope, GetEnvelopes, UpdateEnvelope, DeleteEnvelope } from 'wasp/server/operations'
import type { Envelope, Budget, User } from 'wasp/entities'

type CreateEnvelopeInput = Pick<Envelope, 'name'>

// Action to create a new Envelope for the logged-in user's budget
export const createEnvelope: CreateEnvelope<CreateEnvelopeInput, Envelope> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated')
  }

  // Find the user's budget (should always exist due to signup hook)
  const budget = await context.entities.Budget.findFirstOrThrow({
    where: { userId: context.user.id },
  })

  // Create the new envelope linked to the budget
  const newEnvelope = await context.entities.Envelope.create({
    data: {
      name: args.name,
      budgetId: budget.id, // Link to the user's budget
      // allocatedAmount defaults to 0 as per schema
    },
  })

  return newEnvelope
}

// Query to get all Envelopes for the logged-in user's budget
export const getEnvelopes: GetEnvelopes<void, Envelope[]> = async (
  _args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated')
  }

  // Find the user's budget
  const budget = await context.entities.Budget.findFirst({
    where: { userId: context.user.id },
  })

  // If for some reason the budget doesn't exist, return empty array
  if (!budget) {
    return []
  }

  // Find all envelopes linked to this budget
  const envelopes = await context.entities.Envelope.findMany({
    where: { budgetId: budget.id },
    orderBy: { createdAt: 'asc' }, // Optional: order by creation time
  })

  return envelopes
}

// Type definition for updateEnvelope input
type UpdateEnvelopeInput = { 
  id: string; 
  data: Partial<Pick<Envelope, 'name' | 'allocatedAmount'>> // Allow partial updates of name/allocatedAmount
}

// Action to update an Envelope
export const updateEnvelope: UpdateEnvelope<UpdateEnvelopeInput, Envelope> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated')
  }

  // Find the specific envelope and include its budget to check ownership
  const envelope = await context.entities.Envelope.findUnique({
    where: { id: args.id },
    include: { budget: true }, // Include budget for ownership check
  })

  if (!envelope) {
    throw new HttpError(404, 'Envelope not found')
  }

  // Verify that the user owns the budget this envelope belongs to
  if (envelope.budget.userId !== context.user.id) {
    throw new HttpError(403, 'User is not authorized to update this envelope')
  }

  // Update the envelope
  const updatedEnvelope = await context.entities.Envelope.update({
    where: { id: args.id },
    data: args.data,
  })

  return updatedEnvelope
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

  // Find the specific envelope and include its budget to check ownership
  const envelope = await context.entities.Envelope.findUnique({
    where: { id: args.id },
    include: { budget: true }, // Include budget for ownership check
  })

  if (!envelope) {
    // If already deleted or never existed, maybe return success or specific message?
    // For now, act as if not found is an error.
    throw new HttpError(404, 'Envelope not found')
  }

  // Verify that the user owns the budget this envelope belongs to
  if (envelope.budget.userId !== context.user.id) {
    throw new HttpError(403, 'User is not authorized to delete this envelope')
  }

  // Delete the envelope
  // Prisma's delete returns the deleted object
  const deletedEnvelope = await context.entities.Envelope.delete({
    where: { id: args.id },
  })

  return deletedEnvelope
} 