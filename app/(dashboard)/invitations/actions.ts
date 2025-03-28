'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { 
  invitations, 
  teamMembers, 
  ActivityType, 
  activityLogs,
  users,
  teams
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { z } from 'zod';
import { updateSubscriptionQuantity } from '@/lib/payments/stripe';

type InvitationWithDetails = {
  id: number;
  teamId: number;
  teamName: string;
  invitedBy: string;
  role: string;
};

export async function getPendingInvitations() {
  const user = await getUser();
  
  if (!user) {
    return { invitations: [] };
  }
  
  const pendingInvitations = await db
    .select({
      invitation: invitations,
      team: teams,
      inviter: users,
    })
    .from(invitations)
    .leftJoin(teams, eq(invitations.teamId, teams.id))
    .leftJoin(users, eq(invitations.invitedBy, users.id))
    .where(
      and(
        eq(invitations.email, user.email),
        eq(invitations.status, 'pending'),
      ),
    );
  
  const formattedInvitations: InvitationWithDetails[] = pendingInvitations.map(
    (item) => ({
      id: item.invitation.id,
      teamId: item.invitation.teamId,
      teamName: item.team?.name || 'Unknown Team',
      invitedBy: item.inviter?.email || 'Unknown User',
      role: item.invitation.role,
    })
  );
  
  return { invitations: formattedInvitations };
}

const acceptInvitationSchema = z.object({
  invitationId: z.string().transform((val) => parseInt(val)),
});

export const acceptInvitation = validatedActionWithUser(
  acceptInvitationSchema,
  async (data, _, user) => {
    const { invitationId } = data;
    
    // Get the invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.email, user.email),
          eq(invitations.status, 'pending'),
        ),
      )
      .limit(1);
    
    if (!invitation) {
      return { 
        error: 'Invitation not found or already processed',
        invitationId
      };
    }
    
    // Check if user is already a member of this team
    const existingMembership = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, user.id),
          eq(teamMembers.teamId, invitation.teamId),
        ),
      )
      .limit(1);
    
    if (existingMembership.length > 0) {
      // Update invitation status to accepted
      await db
        .update(invitations)
        .set({ status: 'accepted' })
        .where(eq(invitations.id, invitationId));
      
      return { 
        error: 'You are already a member of this team',
        invitationId
      };
    }
    
    // Add user to the team
    await db.insert(teamMembers).values({
      userId: user.id,
      teamId: invitation.teamId,
      role: invitation.role,
    });
    
    // Update invitation status
    await db
      .update(invitations)
      .set({ status: 'accepted' })
      .where(eq(invitations.id, invitationId));
    
    // Log activity
    await db.insert(activityLogs).values({
      teamId: invitation.teamId,
      userId: user.id,
      action: ActivityType.ACCEPT_INVITATION,
    });
    
    // Update subscription quantity if the team has an active subscription
    await updateSubscriptionQuantity(invitation.teamId);
    
    return { 
      success: 'You have successfully joined the team',
      invitationId
    };
  }
);

// Add declineInvitation function
const declineInvitationSchema = z.object({
  invitationId: z.string().transform((val) => parseInt(val)),
});

export const declineInvitation = validatedActionWithUser(
  declineInvitationSchema,
  async (data, _, user) => {
    const { invitationId } = data;
    
    // Get the invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.email, user.email),
          eq(invitations.status, 'pending'),
        ),
      )
      .limit(1);
    
    if (!invitation) {
      return { 
        error: 'Invitation not found or already processed',
        invitationId
      };
    }
    
    // Update invitation status to declined
    await db
      .update(invitations)
      .set({ status: 'declined' })
      .where(eq(invitations.id, invitationId));
    
    // Log activity
    await db.insert(activityLogs).values({
      teamId: invitation.teamId,
      userId: user.id,
      action: ActivityType.DECLINE_INVITATION,
    });
    
    return { 
      success: 'You have declined the team invitation',
      invitationId
    };
  }
); 