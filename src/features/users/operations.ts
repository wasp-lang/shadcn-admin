import { HttpError } from 'wasp/server';
import type { FindUserByEmail } from 'wasp/server/operations';
import type { User } from 'wasp/entities';

// Reverted: Return ID and Email
type FindUserByEmailInput = { email: string };
type FindUserByEmailOutput = { id: string; email: string } | null; // ID and Email needed by client

// Implementation using Prisma query to search via AuthIdentity
export const findUserByEmail: FindUserByEmail<
  FindUserByEmailInput,
  FindUserByEmailOutput
> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const { email } = args;
  if (!email) {
    return null;
  }

  try {
    const foundUser = await context.entities.User.findFirst({
      where: {
        auth: {
          identities: {
            some: {
              providerName: 'email',
              providerUserId: email,
            },
          },
        },
      },
      select: { id: true }, // Select the User ID
    });

    if (!foundUser) {
      return null; // User not found
    }

    // Return the found user's ID and the searched email
    return {
      id: foundUser.id,
      email: email,
    };

  } catch (error) {
    console.error("Error finding user by email:", error);
    throw new HttpError(500, "Failed to search for user by email.");
  }
};
