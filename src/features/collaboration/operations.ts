import { HttpError } from 'wasp/server';
import type {
  InviteCollaborator,
  RemoveCollaborator,
  UpdateCollaboratorRole,
  GetBudgetCollaborators,
} from 'wasp/server/operations';
import type { User, Budget, BudgetCollaborator } from 'wasp/entities';
import { CollaboratorRole } from '@prisma/client'; // Import enum value
import { getEmail } from 'wasp/auth'; // Import helper to get user email

// Input type for the action
type InviteCollaboratorInput = {
  budgetId: string;
  inviteeUserId: string; // Using User ID instead of email for direct lookup
  role: CollaboratorRole;
};

export const inviteCollaborator: InviteCollaborator<InviteCollaboratorInput, BudgetCollaborator> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const inviterId = context.user.id;
  const { budgetId, inviteeUserId, role } = args;

  // Prevent inviting oneself
  if (inviterId === inviteeUserId) {
    throw new HttpError(400, "You cannot invite yourself.");
  }

  // 1. Validate the budget exists and the inviter is the OWNER
  //    Assuming the Budget.userId field correctly identifies the owner.
  const budget = await context.entities.Budget.findFirst({
    where: { 
      id: budgetId, 
      userId: inviterId // Check if the inviter is the budget owner
    },
    select: { id: true }, // Only need ID for validation
  });

  if (!budget) {
    throw new HttpError(404, 'Budget not found or you are not the owner.');
  }

  // 2. Validate the invitee user exists
  const invitee = await context.entities.User.findUnique({
    where: { id: inviteeUserId },
    select: { id: true }, // Only need ID for validation
  });

  if (!invitee) {
    throw new HttpError(404, 'Invitee user not found.');
  }

  // 3. Check if the invitee is already a collaborator
  const existingCollaboration = await context.entities.BudgetCollaborator.findUnique({
    where: {
      budgetId_userId: { // Using the @@unique constraint
        budgetId: budgetId,
        userId: inviteeUserId,
      },
    },
  });

  if (existingCollaboration) {
    // Optional: Could update the role here instead of throwing an error,
    // but for now, let's require removal first.
    throw new HttpError(409, 'User is already a collaborator on this budget.');
  }
  
  // 4. Check if the inviter is trying to invite the budget owner as a collaborator (redundant)
  const budgetOwner = await context.entities.Budget.findUnique({
    where: { id: budgetId },
    select: { userId: true }
  });
  if (budgetOwner?.userId === inviteeUserId) {
     throw new HttpError(400, "The budget owner cannot be invited as a collaborator.");
  }

  // 5. Create the collaboration record
  try {
    const newCollaborator = await context.entities.BudgetCollaborator.create({
      data: {
        budgetId: budgetId,
        userId: inviteeUserId,
        role: role, // Assign the specified role
      },
    });
    return newCollaborator;
  } catch (error) {
    console.error("Error creating collaboration:", error);
    // Could be a unique constraint violation if check somehow failed (race condition?)
    throw new HttpError(500, 'Failed to add collaborator.');
  }
};

// Input type for removeCollaborator
type RemoveCollaboratorInput = {
  budgetId: string;
  userIdToRemove: string;
};

export const removeCollaborator: RemoveCollaborator<RemoveCollaboratorInput, BudgetCollaborator> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const removerId = context.user.id;
  const { budgetId, userIdToRemove } = args;

  // 1. Validate the budget exists and the remover is the OWNER
  const budget = await context.entities.Budget.findFirst({
    where: { 
      id: budgetId, 
      userId: removerId // Check if the remover is the budget owner
    },
    select: { id: true, userId: true }, // Need owner ID for self-removal check
  });

  if (!budget) {
    throw new HttpError(404, 'Budget not found or you are not the owner.');
  }

  // 2. Prevent Owner from removing themselves via this action
  if (budget.userId === userIdToRemove) {
    throw new HttpError(400, "The budget owner cannot be removed. Consider deleting the budget or transferring ownership.");
  }

  // 3. Find the specific collaboration record to delete
  const collaborationToRemove = await context.entities.BudgetCollaborator.findUnique({
    where: {
      budgetId_userId: {
        budgetId: budgetId,
        userId: userIdToRemove,
      },
    },
  });

  if (!collaborationToRemove) {
    throw new HttpError(404, 'Collaborator not found on this budget.');
  }

  // 4. Delete the collaboration record
  try {
    const deletedCollaboration = await context.entities.BudgetCollaborator.delete({
      where: {
        id: collaborationToRemove.id, // Use the record's own ID for deletion
      },
    });
    return deletedCollaboration;
  } catch (error) {
    console.error("Error removing collaboration:", error);
    throw new HttpError(500, 'Failed to remove collaborator.');
  }
};

// Input type for updateCollaboratorRole
type UpdateCollaboratorRoleInput = {
  budgetId: string;
  collaboratorUserId: string;
  newRole: CollaboratorRole;
};

export const updateCollaboratorRole: UpdateCollaboratorRole<UpdateCollaboratorRoleInput, BudgetCollaborator> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const updaterId = context.user.id;
  const { budgetId, collaboratorUserId, newRole } = args;

  // 1. Validate the budget exists and the updater is the OWNER
  const budget = await context.entities.Budget.findFirst({
    where: { 
      id: budgetId, 
      userId: updaterId // Check if the updater is the budget owner
    },
    select: { id: true, userId: true }, // Need owner ID for check
  });

  if (!budget) {
    throw new HttpError(404, 'Budget not found or you are not the owner.');
  }

  // 2. Prevent Owner's implicit role from being changed via this action
  if (budget.userId === collaboratorUserId) {
    throw new HttpError(400, "The budget owner's role cannot be changed.");
  }

  // 3. Find the specific collaboration record to update
  const collaborationToUpdate = await context.entities.BudgetCollaborator.findUnique({
    where: {
      budgetId_userId: {
        budgetId: budgetId,
        userId: collaboratorUserId,
      },
    },
  });

  if (!collaborationToUpdate) {
    throw new HttpError(404, 'Collaborator not found on this budget.');
  }

  // 4. Update the collaborator's role
  try {
    const updatedCollaboration = await context.entities.BudgetCollaborator.update({
      where: {
        id: collaborationToUpdate.id, // Use the record's own ID
      },
      data: {
        role: newRole,
      },
    });
    return updatedCollaboration;
  } catch (error) {
    console.error("Error updating collaborator role:", error);
    throw new HttpError(500, 'Failed to update collaborator role.');
  }
};

// Type definitions for getBudgetCollaborators
type GetBudgetCollaboratorsInput = { budgetId: string };

// Updated output structure including actual user email
type CollaboratorWithUserInfo = BudgetCollaborator & {
  user: {
    id: string;
    email: string | null; // Include user email for display
  };
};

export const getBudgetCollaborators: GetBudgetCollaborators<
  GetBudgetCollaboratorsInput,
  CollaboratorWithUserInfo[]
> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const userId = context.user.id;
  const { budgetId } = args;

  // 1. Verify the user has access to this budget (owner or collaborator)
  // We can reuse the permission check logic, allowing any role for viewing collaborators
  const budget = await context.entities.Budget.findUnique({
    where: { id: budgetId },
    select: { userId: true }, // Need owner ID
  });

  if (!budget) {
    throw new HttpError(404, 'Budget not found.');
  }

  let hasAccess = budget.userId === userId;
  if (!hasAccess) {
    const collaboration = await context.entities.BudgetCollaborator.findUnique({
      where: { budgetId_userId: { budgetId, userId } },
      select: { role: true },
    });
    hasAccess = !!collaboration;
  }

  if (!hasAccess) {
    throw new HttpError(403, 'You do not have permission to view collaborators for this budget.');
  }

  // 2. Fetch collaborators and include nested user auth identity info
  const collaboratorsRaw = await context.entities.BudgetCollaborator.findMany({
    where: { budgetId: budgetId },
    include: {
      user: { // Include the User relation
        select: {
          id: true, // Select the User ID
          auth: { // Include the related Auth record
            select: {
              identities: { // Include the related AuthIdentity records
                where: { providerName: 'email' }, // Filter for the email identity
                select: {
                  providerUserId: true // This is the email address
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // 3. Map the raw data to the desired output structure
  const collaboratorsWithEmail: CollaboratorWithUserInfo[] = collaboratorsRaw.map(collab => {
    // Extract email from the nested structure
    const emailIdentity = collab.user?.auth?.identities?.[0];
    const email = emailIdentity?.providerUserId || null;

    return {
      // Spread the original collaborator fields (id, budgetId, userId, role, createdAt)
      id: collab.id,
      budgetId: collab.budgetId,
      userId: collab.userId,
      role: collab.role,
      createdAt: collab.createdAt,
      // Add the nested user info with email
      user: {
        id: collab.user.id,
        email: email,
      }
    };
  });

  return collaboratorsWithEmail;
}; 