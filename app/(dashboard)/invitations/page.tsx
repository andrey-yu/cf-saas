'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitation, declineInvitation, getPendingInvitations } from './actions';

type Invitation = {
  id: number;
  teamId: number;
  teamName: string;
  invitedBy: string;
  role: string;
};

type AcceptInvitationState = {
  success?: string;
  error?: string;
  invitationId?: number;
};

export default function InvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [acceptState, acceptAction, isAccepting] = useActionState<
    AcceptInvitationState,
    FormData
  >(
    acceptInvitation,
    { success: '', error: '' }
  );
  
  const [declineState, declineAction, isDeclining] = useActionState<
    AcceptInvitationState,
    FormData
  >(
    declineInvitation,
    { success: '', error: '' }
  );
  
  useEffect(() => {
    async function loadInvitations() {
      try {
        const response = await getPendingInvitations();
        setInvitations(response.invitations || []);
      } catch (error) {
        console.error('Failed to load invitations:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadInvitations();
  }, []);
  
  // Redirect to dashboard if there are no invitations
  useEffect(() => {
    if (!loading && invitations.length === 0) {
      router.push('/dashboard');
    }
  }, [loading, invitations, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Pending Team Invitations</h1>
      
      {invitations.length > 0 ? (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <Card key={invitation.id}>
              <CardHeader>
                <CardTitle>Invitation to join {invitation.teamName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>
                    You've been invited by <strong>{invitation.invitedBy}</strong> to join{' '}
                    <strong>{invitation.teamName}</strong> as a <strong>{invitation.role}</strong>.
                  </p>
                  
                  {acceptState.error && acceptState.invitationId === invitation.id && (
                    <p className="text-red-500">{acceptState.error}</p>
                  )}
                  
                  {acceptState.success && acceptState.invitationId === invitation.id && (
                    <p className="text-green-500">{acceptState.success}</p>
                  )}
                  
                  {declineState.error && declineState.invitationId === invitation.id && (
                    <p className="text-red-500">{declineState.error}</p>
                  )}
                  
                  {declineState.success && declineState.invitationId === invitation.id && (
                    <p className="text-green-500">{declineState.success}</p>
                  )}
                  
                  <div className="flex space-x-4">
                    <form action={acceptAction}>
                      <input type="hidden" name="invitationId" value={invitation.id} />
                      <Button 
                        type="submit"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        disabled={isAccepting || isDeclining}
                      >
                        {isAccepting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          'Accept Invitation'
                        )}
                      </Button>
                    </form>
                    
                    <form action={declineAction}>
                      <input type="hidden" name="invitationId" value={invitation.id} />
                      <Button 
                        type="submit"
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        disabled={isAccepting || isDeclining}
                      >
                        {isDeclining ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Declining...
                          </>
                        ) : (
                          'Decline Invitation'
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p>You have no pending invitations.</p>
      )}
    </div>
  );
} 