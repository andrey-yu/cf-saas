import { getAllTeamsForUser, getTeamForUser, getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TeamSwitcherClient } from '@/components/TeamSwitcherClient';

export async function TeamProvider({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }
  
  // Get all teams the user belongs to
  const userTeams = await getAllTeamsForUser(user.id);
  
  if (userTeams.length === 0) {
    // User has no teams, this shouldn't normally happen
    return <div>No teams found. Please contact support.</div>;
  }
  
  // Get the current team to determine current team ID
  const currentTeam = await getTeamForUser(user.id);
  const currentTeamId = currentTeam?.id || userTeams[0].teamId;
  
  // Find current team name and user's role from userTeams
  const currentTeamData = userTeams.find(team => team.teamId === currentTeamId);
  const currentTeamName = currentTeamData?.teamName || 'Unknown Team';
  const userRole = currentTeamData?.role || 'member';

  // Get user display info
  const displayName = user.name || user.email || 'User';
  const userInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('');
  
  return (
    <div>
      <div className="w-full bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={`/placeholder.svg?height=32&width=32`}
              alt={displayName}
            />
            <AvatarFallback className="text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{displayName}</p>
            {user.email && user.name && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium mr-2 hidden sm:block">
            Role: <span className="capitalize text-orange-500">{userRole}</span> in
          </div>
          <TeamSwitcherClient teams={userTeams} currentTeamId={currentTeamId} />
        </div>
      </div>
      {children}
    </div>
  );
} 