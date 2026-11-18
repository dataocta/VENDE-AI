import type { IncomingMessage, ServerResponse } from 'node:http';
import Stripe from 'stripe';

type PlanType = 'monthly' | 'annual';

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function mapStripeSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'trial' | 'expired' {
  if (stripeStatus === 'active') return 'active';
  if (stripeStatus === 'trialing') return 'trial';
  return 'expired';
}

function getSubscriptionCurrentPeriodEndIso(
  sub: Stripe.Subscription | string | null | undefined
): string | undefined {
  if (!sub || typeof sub === 'string') return undefined;
  const itemPeriodEnd = sub.items?.data?.[0]?.current_period_end;
  const rawEnd =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    itemPeriodEnd;
  if (typeof rawEnd === 'number' && rawEnd > 0) {
    return new Date(rawEnd * 1000).toISOString();
  }
  return undefined;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const parsedUrl = new URL(req.url || '/', 'http://localhost');
  const customerId = parsedUrl.searchParams.get('customerId') || undefined;
  const email = parsedUrl.searchParams.get('email') || undefined;

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    sendJson(res, 200, { configured: false });
    return;
  }

  const stripe = new Stripe(key);

  try {
    let targetCustomerId = customerId;

    if (!targetCustomerId && email) {
      const listed = await stripe.customers.list({
        email: email.trim().toLowerCase(),
        limit: 1,
      });
      targetCustomerId = listed.data[0]?.id;
    }

    if (!targetCustomerId) {
      sendJson(res, 200, { configured: true, found: false });
      return;
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: targetCustomerId,
      status: 'all',
      limit: 5,
    });

    if (subscriptions.data.length === 0) {
      sendJson(res, 200, {
        configured: true,
        found: false,
        stripeCustomerId: targetCustomerId,
      });
      return;
    }

    const activeSub =
      subscriptions.data.find((s) => s.status === 'active' || s.status === 'trialing') ||
      subscriptions.data[0];

    const mappedStatus = mapStripeSubscriptionStatus(activeSub.status);
    const selectedPlan = (activeSub.metadata?.plan as PlanType) || undefined;
    const subscriptionExpiresAt = getSubscriptionCurrentPeriodEndIso(activeSub);

    sendJson(res, 200, {
      configured: true,
      found: true,
      subscriptionStatus: mappedStatus,
      stripeStatus: activeSub.status,
      stripeCustomerId: targetCustomerId,
      stripeSubscriptionId: activeSub.id,
      selectedPlan,
      subscriptionExpiresAt,
      cancelAtPeriodEnd: activeSub.cancel_at_period_end,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erro ao consultar status na Stripe.';
    console.error('Error querying Stripe subscription status on Vercel:', err);
    sendJson(res, 500, { error: message });
  }
}
