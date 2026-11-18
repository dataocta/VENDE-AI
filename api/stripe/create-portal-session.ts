import type { IncomingMessage, ServerResponse } from 'node:http';
import Stripe from 'stripe';

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
      error: 'STRIPE_SECRET_KEY não configurada nas Environment Variables da Vercel.',
      missingKey: true,
    });
    return;
  }

  const stripe = new Stripe(key);

  try {
    const { customerId, email, userId, name, returnUrl } = await readJsonBody<{
      customerId?: string;
      email?: string;
      userId?: string;
      name?: string;
      returnUrl?: string;
    }>(req);

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

    sendJson(res, 200, { url: portalSession.url, customerId: customer.id });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erro ao abrir o Portal de Assinaturas da Stripe.';
    console.error('Error creating Stripe portal session on Vercel:', err);
    sendJson(res, 500, { error: message });
  }
}
