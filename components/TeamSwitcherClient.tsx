'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronsUpDown } from 'lucide-react';
import { switchTeam } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Team = {
  teamId: number;
  teamName: string;
  role: string;
};

export function TeamSwitcherClient({ teams, currentTeamId }: { teams: Team[]; currentTeamId: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  // Find the current team based on the current team ID
  const currentTeam = teams.find(team => team.teamId === currentTeamId) || teams[0];
  
  if (!currentTeam || teams.length === 0) {
    return null;
  }
  
  const handleTeamSwitch = async (teamId: number) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('teamId', teamId.toString());
      await switchTeam(null as any, formData); // The first parameter is not used
      router.refresh(); // Refresh the page to reflect the team change
      setOpen(false);
    });
  };

  // If there's only one team, just show the team name without dropdown
  if (teams.length === 1) {
    return (
      <div className="flex items-center">
        <Avatar className="h-6 w-6 mr-2">
          <AvatarFallback className="bg-orange-500 text-white">
            {currentTeam.teamName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{currentTeam.teamName}</span>
      </div>
    );
  }
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-auto h-8 pl-3 pr-2 text-sm justify-between" disabled={isPending}>
          <div className="flex items-center">
            <Avatar className="h-5 w-5 mr-2">
              <AvatarFallback className="bg-orange-500 text-white text-xs">
                {currentTeam.teamName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="mr-1">{currentTeam.teamName}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 ml-1 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Switch Team</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.teamId}
            className="cursor-pointer"
            onClick={() => handleTeamSwitch(team.teamId)}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Avatar className="h-5 w-5 mr-2">
                  <AvatarFallback className="bg-orange-500 text-white text-xs">
                    {team.teamName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{team.teamName}</span>
              </div>
              {team.teamId === currentTeamId && (
                <Check className="h-4 w-4" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 