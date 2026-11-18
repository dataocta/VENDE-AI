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

function resolveOrigin(req: IncomingMessage, fallbackUrl?: string): string {
  if (fallbackUrl) {
    try {
      return new URL(fallbackUrl).origin;
    } catch {
      // Ignore malformed fallbackUrl
    }
  }
  const originHeader = req.headers.origin;
  if (typeof originHeader === 'string' && originHeader.startsWith('http')) {
    return originHeader;
  }
  const forwardedHost = req.headers['x-forwarded-host'];
  const host =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ||
    req.headers.host;
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto =
    (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ||
    'https';
  return `${proto}://${host || 'localhost:3000'}`;
}

async function resolveOrCreateCustomer(
  stripe: Stripe,
  params: { userId?: string; email?: string; name?: string; customerId?: string }
): Promise<Stripe.Customer> {
  if (params.customerId) {
    try {
      const existing = await stripe.customers.retrieve(params.customerId);
      if (!existing.deleted) {
        return existing as Stripe.Customer;
      }
    } catch {
      // Fall through to email lookup or create
    }
  }

  const cleanEmail = params.email?.trim().toLowerCase();
  if (cleanEmail) {
    const listed = await stripe.customers.list({ email: cleanEmail, limit: 1 });
    if (listed.data.length > 0) {
      const found = listed.data[0];
      if (params.userId && found.metadata?.userId !== params.userId) {
        await stripe.customers.update(found.id, {
          metadata: { ...found.metadata, userId: params.userId },
        });
      }
      return found;
    }
  }

  return await stripe.customers.create({
    email: cleanEmail || undefined,
    name: params.name?.trim() || undefined,
    metadata: {
      ...(params.userId ? { userId: params.userId } : {}),
    },
  });
}

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    sendJson(res, 503, {
      error:
        'A chave STRIPE_SECRET_KEY ainda não foi configurada nas Environment Variables da Vercel.',
      missingKey: true,
    });
    return;
  }

  const stripe = new Stripe(key);

  try {
    const body = await readJsonBody<{
      userId?: string;
      email?: string;
      name?: string;
      customerId?: string;
      plan?: 'trial' | PlanType;
      trialDays?: number;
      returnUrl?: string;
    }>(req);

    const {
      userId,
      email,
      name,
      customerId,
      plan = 'monthly',
      trialDays,
      returnUrl,
    } = body;

    const selectedPlan: PlanType = plan === 'annual' ? 'annual' : 'monthly';
    const effectiveTrialDays =
      typeof trialDays === 'number' && trialDays > 0
        ? trialDays
        : plan === 'trial'
        ? 7
        : undefined;

    const hasCustomerIdentifier = Boolean(customerId?.trim() || email?.trim());
    const customer = hasCustomerIdentifier
      ? await resolveOrCreateCustomer(stripe, {
          userId,
          email,
          name,
          customerId,
        })
      : null;

    const configuredPriceId =
      selectedPlan === 'annual'
        ? process.env.STRIPE_PRICE_ID_ANNUAL?.trim()
        : process.env.STRIPE_PRICE_ID_MONTHLY?.trim();

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = configuredPriceId
      ? { price: configuredPriceId, quantity: 1 }
      : {
          price_data: {
            currency: 'brl',
            product_data: {
              name:
                selectedPlan === 'annual'
                  ? 'Vende.ai Pro — Plano Anual'
                  : 'Vende.ai Pro — Plano Mensal',
              description:
                'PDV rápido para vendas na rua, controle de despesas, fluxo de caixa e fiado no WhatsApp.',
            },
            unit_amount: selectedPlan === 'annual' ? 14990 : 1597,
            recurring: {
              interval: selectedPlan === 'annual' ? 'year' : 'month',
            },
          },
          quantity: 1,
        };

    const origin = resolveOrigin(req, returnUrl);
    const successUrl = `${origin}/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/?stripe_status=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(customer ? { customer: customer.id } : {}),
      client_reference_id: userId || undefined,
      line_items: [lineItem],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      locale: 'pt-BR',
      metadata: {
        ...(userId ? { userId } : {}),
        plan: selectedPlan,
        requestedPlan: plan,
      },
      subscription_data: {
        ...(effectiveTrialDays ? { trial_period_days: effectiveTrialDays } : {}),
        metadata: {
          ...(userId ? { userId } : {}),
          plan: selectedPlan,
          requestedPlan: plan,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    sendJson(res, 200, {
      url: session.url,
      sessionId: session.id,
      customerId: customer?.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar sessão Stripe.';
    console.error('Error creating Stripe checkout session on Vercel:', err);
    sendJson(res, 500, { error: message });
  }
}
