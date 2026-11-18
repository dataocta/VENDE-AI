import type { IncomingMessage, ServerResponse } from 'node:http';
import Stripe from 'stripe';

type PlanType = 'monthly' | 'annual';
type RequestWithBody = IncomingMessage & { body?: unknown };

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJsonBody<T = Record<string, unknown>>(req: RequestWithBody): Promise<T> {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      return (req.body ? JSON.parse(req.body) : {}) as T;
    }
    if (Buffer.isBuffer(req.body)) {
      const raw = req.body.toString('utf8');
      return (raw ? JSON.parse(raw) : {}) as T;
    }
    return req.body as T;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return (raw ? JSON.parse(raw) : {}) as T;
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

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    sendJson(res, 503, {
      error: 'STRIPE_SECRET_KEY não configurada nas Environment Variables da Vercel.',
      missingKey: true,
    });
    return;
  }

  const stripe = new Stripe(key);

  try {
    const { sessionId, userId } = await readJsonBody<{
      sessionId?: string;
      userId?: string;
    }>(req);

    if (!sessionId) {
      sendJson(res, 400, { error: 'sessionId é obrigatório.' });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    const sessionUserId = session.metadata?.userId || session.client_reference_id;
    if (userId && sessionUserId && sessionUserId !== userId) {
      sendJson(res, 403, { error: 'Sessão não pertence ao usuário autenticado.' });
      return;
    }

    const isComplete =
      session.status === 'complete' ||
      session.payment_status === 'paid' ||
      session.payment_status === 'no_payment_required';

    const subscriptionObj =
      session.subscription && typeof session.subscription !== 'string'
        ? session.subscription
        : null;

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : subscriptionObj?.id;

    const customerObj =
      session.customer &&
      typeof session.customer !== 'string' &&
      !session.customer.deleted
        ? session.customer
        : null;

    const customerId =
      typeof session.customer === 'string' ? session.customer : customerObj?.id;

    const customerEmail =
      session.customer_details?.email || customerObj?.email || undefined;
    const customerName =
      session.customer_details?.name || customerObj?.name || undefined;

    const selectedPlan = (session.metadata?.plan as PlanType) || 'monthly';
    const mappedStatus = subscriptionObj
      ? mapStripeSubscriptionStatus(subscriptionObj.status)
      : isComplete
      ? 'active'
      : 'expired';

    const currentPeriodEnd = getSubscriptionCurrentPeriodEndIso(subscriptionObj);

    sendJson(res, 200, {
      verified: isComplete,
      subscriptionStatus: mappedStatus,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      customerEmail,
      customerName,
      plan: selectedPlan,
      planPrice: selectedPlan === 'annual' ? 149.9 : 15.97,
      currentPeriodEnd,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao verificar sessão.';
    console.error('Error verifying Stripe session on Vercel:', err);
    sendJson(res, 500, { error: message });
  }
}
