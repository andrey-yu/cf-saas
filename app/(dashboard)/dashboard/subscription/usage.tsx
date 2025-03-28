'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamDataWithMembers } from '@/lib/db/schema';
import { format } from 'date-fns';

export function SubscriptionUsage({ teamData }: { teamData: TeamDataWithMembers }) {
  const memberCount = teamData.teamMembers.length;
  const pricePerSeat = 1000; // Default to $10 per seat if not available in team data
  
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Not available';
    return format(new Date(date), 'MMM d, yyyy');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Current Plan</p>
            <p className="text-lg">{teamData.planName || 'Free'}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Seats Used</p>
            <p className="text-lg">{memberCount}</p>
          </div>
          {teamData.subscriptionStatus === 'active' && (
            <>
              <div>
                <p className="text-sm font-medium">Monthly Cost</p>
                <p className="text-lg">
                  ${((teamData.seatsBilled || memberCount) * pricePerSeat) / 100} 
                  <span className="text-sm text-gray-500 ml-1">
                    (${pricePerSeat / 100} per seat)
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Next Billing Date</p>
                <p className="text-lg">{formatDate(teamData.nextBillingDate)}</p>
              </div>
            </>
          )}
          {teamData.subscriptionStatus === 'trialing' && (
            <div>
              <p className="text-sm font-medium">Trial Status</p>
              <p className="text-lg">
                Trial active until {formatDate(teamData.nextBillingDate)}
                {teamData.cancelAtPeriodEnd && (
                  <span className="block text-sm text-amber-600 font-medium mt-1">
                    Your trial will not automatically convert to a paid subscription
                  </span>
                )}
              </p>
            </div>
          )}
          {(!teamData.subscriptionStatus || teamData.subscriptionStatus === 'canceled') && (
            <div>
              <p className="text-sm font-medium">Subscription Status</p>
              <p className="text-lg">No active subscription</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 