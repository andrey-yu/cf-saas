import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { Team, teams } from '@/lib/db/schema';
import { db } from '@/lib/db/drizzle';
import { eq } from 'drizzle-orm';
import {
  getTeamByStripeCustomerId,
  getUser,
  updateTeamSubscription,
  getTeamMemberCount,
  updateTeamSeatsAndBilling
} from '@/lib/db/queries';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
});

export async function createCheckoutSession({
  team,
  priceId
}: {
  team: Team | null;
  priceId: string;
}) {
  const user = await getUser();
  console.log('QQQ2 redirect', redirect);

  if (!team || !user) {
    console.log('QQQ1 redirect', redirect);
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }
  
  // Get the number of team members for per-seat billing
  const memberCount = await getTeamMemberCount(team.id);
  // Ensure at least 1 seat is billed
  const quantity = Math.max(1, memberCount);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: quantity
      }
    ],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/pricing`,
    customer: team.stripeCustomerId || undefined,
    client_reference_id: user.id.toString(),
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 14
    }
  });

  redirect(session.url!);
}

export async function createCustomerPortalSession(team: Team) {
  if (!team.stripeCustomerId || !team.stripeProductId) {
    redirect('/pricing');
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(team.stripeProductId);
    if (!product.active) {
      throw new Error("Team's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the team's product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription'
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id)
            }
          ]
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other'
            ]
          }
        }
      }
    });
  }

  return stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: `${process.env.BASE_URL}/dashboard`,
    configuration: configuration.id
  });
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  const team = await getTeamByStripeCustomerId(customerId);

  if (!team) {
    console.error('Team not found for Stripe customer:', customerId);
    return;
  }

  if (status === 'active' || status === 'trialing') {
    const plan = subscription.items.data[0]?.plan;
    const quantity = subscription.items.data[0]?.quantity || 1;
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    // Update team subscription with plan and seat count
    await updateTeamSubscription(team.id, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: plan?.product as string,
      planName: (plan?.product as Stripe.Product).name,
      subscriptionStatus: status,
      cancelAtPeriodEnd
    });
    
    // Update seats billed and next billing date
    await updateTeamSeatsAndBilling(team.id, {
      seatsBilled: quantity,
      nextBillingDate: currentPeriodEnd
    });
    
    console.log(`Subscription ${subscriptionId} updated with status ${status}, cancel at period end: ${cancelAtPeriodEnd}`);
  } else if (status === 'canceled' || status === 'unpaid') {
    // Clear subscription data
    await updateTeamSubscription(team.id, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: status,
      cancelAtPeriodEnd: false
    });
    
    // Reset seats billed
    await updateTeamSeatsAndBilling(team.id, {
      seatsBilled: undefined,
      nextBillingDate: undefined
    });
    
    console.log(`Subscription ${subscriptionId} was canceled or is unpaid`);
  }
}

export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days
  }));
}

export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id
  }));
}

export async function updateSubscriptionQuantity(teamId: number) {
  const team = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1)
    .then(res => res[0]);
  
  if (!team?.stripeSubscriptionId) {
    return; // No subscription to update
  }
  
  const memberCount = await getTeamMemberCount(teamId);
  const quantity = Math.max(1, memberCount);
  
  try {
    // Get the subscription to find the subscription item ID
    const subscription = await stripe.subscriptions.retrieve(team.stripeSubscriptionId);
    const subscriptionItemId = subscription.items.data[0].id;
    
    // Update the subscription quantity
    await stripe.subscriptions.update(team.stripeSubscriptionId, {
      items: [{
        id: subscriptionItemId,
        quantity: quantity
      }],
    });
    
    // Calculate the next billing date
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    // Update the team's seats billed and next billing date
    await updateTeamSeatsAndBilling(teamId, {
      seatsBilled: quantity,
      nextBillingDate: currentPeriodEnd
    });
    
    return { success: true, quantity };
  } catch (error) {
    console.error('Error updating subscription quantity:', error);
    return { error: 'Failed to update subscription quantity' };
  }
}
