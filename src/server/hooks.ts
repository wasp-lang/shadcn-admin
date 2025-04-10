import type { OnAfterSignupHook } from 'wasp/server/auth'
import type { User } from 'wasp/entities'
import type { PrismaClient } from '@prisma/client'

// This hook runs after a user successfully signs up
export const handleNewUserSignup: OnAfterSignupHook = async ({
  user,
  prisma,
}) => {
  try {
    // Create a default budget for the new user using prisma client
    await prisma.budget.create({
      data: {
        // Link the budget to the user using their id
        userId: user.id,
        // The name defaults to "My Budget" as defined in schema.prisma
      },
    })
    console.log(`Budget created for new user: ${user.id}`)
  } catch (error) {
    // Log error if budget creation fails, but don't block signup
    console.error('Error creating budget for user:', user.id, error)
    // Depending on requirements, you might want to throw an error here
    // or implement retry logic, but for now, we'll just log it.
  }
} 