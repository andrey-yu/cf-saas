import { z } from 'zod';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export type ActionState = {
  error?: string;
  success?: string;
  [key: string]: any; // This allows for additional properties
};

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData
) => Promise<T>;

export function validatedAction<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message } as T;
    }

    return action(result.data, formData);
  };
}

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const user = await getUser();
    if (!user) {
      throw new Error('User is not authenticated');
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message } as T;
    }

    return action(result.data, formData, user);
  };
}

type ActionWithTeamFunction<T> = (
  formData: FormData,
  team: TeamDataWithMembers
) => Promise<T>;

export function withTeam<T>(action: ActionWithTeamFunction<T>) {
  return async (formData: FormData): Promise<T> => {
    const user = await getUser();
    if (!user) {
      console.log('QQQ4 user not found');
      
      // Determine the appropriate redirect based on form data
      let redirectURL = '/sign-in';
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // Check if this is a checkout action by looking for priceId
      const priceId = formData.get('priceId');
      if (priceId) {
        console.log('QQQ5 priceId from formData:', priceId);
        params.set('redirect', 'checkout');
        params.set('priceId', priceId.toString());
      }
      
      // Check for and preserve other important parameters
      const inviteId = formData.get('inviteId');
      if (inviteId) {
        params.set('inviteId', inviteId.toString());
      }
      
      // Only append params if we have any
      if (params.toString()) {
        redirectURL += `?${params.toString()}`;
      }
      
      console.log('QQQ6 redirecting to:', redirectURL);
      redirect(redirectURL);
    }

    const team = await getTeamForUser(user.id);
    if (!team) {
      throw new Error('Team not found');
    }

    return action(formData, team);
  };
}
