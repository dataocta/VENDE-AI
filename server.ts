import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

type PlanType = 'monthly' | 'annual';

interface CachedStripeStatus {
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'blocked';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  selectedPlan?: PlanType;
  subscriptionExpiresAt?: string;
  updatedAt: string;
}

// In-memory webhook event cache for immediate status resolution
const stripeStatusByUserId = new Map<string, CachedStripeStatus>();
const stripeUserByCustomerId = new Map<string, string>();

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
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
  const rawEnd = (sub as unknown as { current_period_end?: number }).current_period_end ?? itemPeriodEnd;
  if (typeof rawEnd === 'number' && rawEnd > 0) {
    return new Date(rawEnd * 1000).toISOString();
  }
  return undefined;
}

function resolveOrigin(req: Request, fallbackUrl?: string): string {
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
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req.protocol || 'http';
  return `${proto}://${host || `localhost:${PORT}`}`;
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

async function startServer() {
  const app = express();

  // ---------------------------------------------------------------------------
  // 1. STRIPE WEBHOOK ROUTE (MUST BE REGISTERED BEFORE express.json())
  // ---------------------------------------------------------------------------
  app.get('/api/stripe/webhook', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      endpoint: '/api/stripe/webhook',
      method: 'POST',
      configured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    });
  });

  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      const stripe = getStripeClient();
      if (!stripe) {
        res.status(503).json({
          error: 'STRIPE_SECRET_KEY não configurada no servidor.',
        });
        return;
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
      const signature = req.headers['stripe-signature'];

      let event: Stripe.Event;
      try {
        if (webhookSecret && typeof signature === 'string') {
          event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
        } else if (process.env.NODE_ENV === 'production' && webhookSecret) {
          res.status(400).json({ error: 'Assinatura stripe-signature ausente.' });
          return;
        } else {
          // Local dev fallback when STRIPE_WEBHOOK_SECRET is not configured yet
          event = JSON.parse(req.body.toString('utf8')) as Stripe.Event;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('Webhook signature verification failed:', message);
        res.status(400).json({ error: `Webhook Error: ${message}` });
        return;
      }

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId || session.client_reference_id;
            const customerId =
              typeof session.customer === 'string' ? session.customer : session.customer?.id;
            const subscriptionId =
              typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription?.id;
            const selectedPlan = (session.metadata?.plan as PlanType) || 'monthly';

            if (userId && customerId) {
              stripeUserByCustomerId.set(customerId, userId);
              stripeStatusByUserId.set(userId, {
                subscriptionStatus: 'active',
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                selectedPlan,
                updatedAt: new Date().toISOString(),
              });
            }
            break;
          }

          case 'customer.subscription.created':
          case 'customer.subscription.updated':
          case 'customer.subscription.deleted': {
            const sub = event.data.object as Stripe.Subscription;
            const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
            const userId =
              sub.metadata?.userId || (customerId ? stripeUserByCustomerId.get(customerId) : undefined);

            if (userId) {
              const mappedStatus =
                event.type === 'customer.subscription.deleted'
                  ? 'expired'
                  : mapStripeSubscriptionStatus(sub.status);
              stripeStatusByUserId.set(userId, {
                subscriptionStatus: mappedStatus,
                stripeCustomerId: customerId,
                stripeSubscriptionId: sub.id,
                selectedPlan: (sub.metadata?.plan as PlanType) || undefined,
                subscriptionExpiresAt: getSubscriptionCurrentPeriodEndIso(sub),
                updatedAt: new Date().toISOString(),
              });
            }
            break;
          }

          case 'invoice.paid': {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId =
              typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
            const userId = customerId ? stripeUserByCustomerId.get(customerId) : undefined;
            if (userId) {
              const prev = stripeStatusByUserId.get(userId);
              stripeStatusByUserId.set(userId, {
                ...prev,
                subscriptionStatus: 'active',
                stripeCustomerId: customerId,
                updatedAt: new Date().toISOString(),
              });
            }
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId =
              typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
            const userId = customerId ? stripeUserByCustomerId.get(customerId) : undefined;
            if (userId) {
              const prev = stripeStatusByUserId.get(userId);
              stripeStatusByUserId.set(userId, {
                ...prev,
                subscriptionStatus: 'expired',
                stripeCustomerId: customerId,
                updatedAt: new Date().toISOString(),
              });
            }
            break;
          }

          default:
            break;
        }

        res.json({ received: true });
      } catch (err) {
        console.error('Error handling Stripe webhook event:', err);
        res.status(500).json({ error: 'Erro interno ao processar webhook da Stripe.' });
      }
    }
  );

  // Parse JSON bodies for all remaining API endpoints
  app.use(express.json());

  // ---------------------------------------------------------------------------
  // 2. STRIPE CONFIG & HEALTH CHECK
  // ---------------------------------------------------------------------------
  app.get('/api/stripe/config', (_req: Request, res: Response) => {
    res.json({
      configured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
      hasMonthlyPriceId: Boolean(process.env.STRIPE_PRICE_ID_MONTHLY?.trim()),
      hasAnnualPriceId: Boolean(process.env.STRIPE_PRICE_ID_ANNUAL?.trim()),
    });
  });

  // ---------------------------------------------------------------------------
  // 3. CREATE STRIPE CHECKOUT SESSION (STRIPE PAYMENTS + STRIPE BILLING)
  // ---------------------------------------------------------------------------
  app.post('/api/stripe/create-checkout-session', async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    if (!stripe) {
      res.status(503).json({
        error:
          'A chave STRIPE_SECRET_KEY ainda não foi configurada nos Secrets do servidor.',
        missingKey: true,
      });
      return;
    }

    try {
      const {
        userId,
        email,
        name,
        customerId,
        plan = 'monthly',
        trialDays,
        returnUrl,
      } = req.body as {
        userId?: string;
        email?: string;
        name?: string;
        customerId?: string;
        plan?: 'trial' | PlanType;
        trialDays?: number;
        returnUrl?: string;
      };

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

      if (userId && customer) {
        stripeUserByCustomerId.set(customer.id, userId);
      }

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

      res.json({
        url: session.url,
        sessionId: session.id,
        customerId: customer?.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar sessão Stripe.';
      console.error('Error creating Stripe checkout session:', err);
      res.status(500).json({ error: message });
    }
  });

  // ---------------------------------------------------------------------------
  // 4. VERIFY COMPLETED CHECKOUT SESSION ON RETURN
  // ---------------------------------------------------------------------------
  app.post('/api/stripe/verify-session', async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    if (!stripe) {
      res.status(503).json({
        error: 'STRIPE_SECRET_KEY não configurada no servidor.',
        missingKey: true,
      });
      return;
    }

    try {
      const { sessionId, userId } = req.body as { sessionId?: string; userId?: string };
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId é obrigatório.' });
        return;
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });

      const sessionUserId = session.metadata?.userId || session.client_reference_id;
      if (userId && sessionUserId && sessionUserId !== userId) {
        res.status(403).json({ error: 'Sessão não pertence ao usuário autenticado.' });
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

      if (sessionUserId && customerId) {
        stripeUserByCustomerId.set(customerId, sessionUserId);
        stripeStatusByUserId.set(sessionUserId, {
          subscriptionStatus: mappedStatus,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          selectedPlan,
          subscriptionExpiresAt: currentPeriodEnd,
          updatedAt: new Date().toISOString(),
        });
      }

      res.json({
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
      console.error('Error verifying Stripe session:', err);
      res.status(500).json({ error: message });
    }
  });

  // ---------------------------------------------------------------------------
  // 5. CREATE STRIPE CUSTOMER BILLING PORTAL SESSION
  // ---------------------------------------------------------------------------
  app.post('/api/stripe/create-portal-session', async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    if (!stripe) {
      res.status(503).json({
        error: 'STRIPE_SECRET_KEY não configurada no servidor.',
        missingKey: true,
      });
      return;
    }

    try {
      const { customerId, email, userId, name, returnUrl } = req.body as {
        customerId?: string;
        email?: string;
        userId?: string;
        name?: string;
        returnUrl?: string;
      };

      const customer = await resolveOrCreateCustomer(stripe, {
        customerId,
        email,
        userId,
        name,
      });

      const origin = resolveOrigin(req, returnUrl);
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${origin}/`,
      });

      res.json({ url: portalSession.url, customerId: customer.id });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao abrir o Portal de Assinaturas da Stripe.';
      console.error('Error creating Stripe portal session:', err);
      res.status(500).json({ error: message });
    }
  });

  // ---------------------------------------------------------------------------
  // 6. SYNC LIVE SUBSCRIPTION STATUS FROM STRIPE OR WEBHOOK CACHE
  // ---------------------------------------------------------------------------
  app.get('/api/stripe/subscription-status', async (req: Request, res: Response) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const customerId =
      typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
    const email = typeof req.query.email === 'string' ? req.query.email : undefined;

    const stripe = getStripeClient();
    if (!stripe) {
      const cached = userId ? stripeStatusByUserId.get(userId) : undefined;
      res.json({
        configured: false,
        ...(cached || {}),
      });
      return;
    }

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
        const cached = userId ? stripeStatusByUserId.get(userId) : undefined;
        res.json({
          configured: true,
          found: Boolean(cached),
          ...(cached || {}),
        });
        return;
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: targetCustomerId,
        status: 'all',
        limit: 5,
      });

      if (subscriptions.data.length === 0) {
        res.json({
          configured: true,
          found: false,
          stripeCustomerId: targetCustomerId,
        });
        return;
      }

      // Prioritize active/trialing subscription over canceled ones
      const activeSub =
        subscriptions.data.find((s) => s.status === 'active' || s.status === 'trialing') ||
        subscriptions.data[0];

      const mappedStatus = mapStripeSubscriptionStatus(activeSub.status);
      const selectedPlan = (activeSub.metadata?.plan as PlanType) || undefined;
      const subscriptionExpiresAt = getSubscriptionCurrentPeriodEndIso(activeSub);

      if (userId) {
        stripeUserByCustomerId.set(targetCustomerId, userId);
        stripeStatusByUserId.set(userId, {
          subscriptionStatus: mappedStatus,
          stripeCustomerId: targetCustomerId,
          stripeSubscriptionId: activeSub.id,
          selectedPlan,
          subscriptionExpiresAt,
          updatedAt: new Date().toISOString(),
        });
      }

      res.json({
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
      console.error('Error querying Stripe subscription status:', err);
      res.status(500).json({ error: message });
    }
  });

  // ---------------------------------------------------------------------------
  // 7. VITE DEV MIDDLEWARE OR PRODUCTION STATIC ASSETS
  // ---------------------------------------------------------------------------
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Vende.ai server running on http://0.0.0.0:${PORT} (${
        isProduction ? 'production' : 'development'
      })`
    );
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
