import { redirect } from 'next/navigation';
import { Settings } from './settings';
import { getTeamForUser, getUser } from '@/lib/db/queries';

export default async function SettingsPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const teamData = await getTeamForUser(user.id);

  if (!teamData) {
    throw new Error('Team not found');
  }
  
  // No need to get all teams anymore, as we don't need them in the Settings component

  return <Settings teamData={teamData} />;
}
