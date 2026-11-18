import type { IncomingMessage, ServerResponse } from 'node:http';
import Stripe from 'stripe';

export const config = {
  api: {
    bodyParser: false,
  },
};

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readRawBody(req: IncomingMessage & { body?: unknown }): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'utf8');
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
) {
  if (req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      endpoint: '/api/stripe/webhook',
      method: 'POST',
      configured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    sendJson(res, 503, { error: 'STRIPE_SECRET_KEY não configurada.' });
    return;
  }

  const stripe = new Stripe(key);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = req.headers['stripe-signature'];

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    if (webhookSecret && typeof signature === 'string') {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else if (webhookSecret) {
      sendJson(res, 400, { error: 'Assinatura stripe-signature ausente.' });
      return;
    } else {
      event = JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('Vercel Stripe Webhook signature error:', message);
    sendJson(res, 400, { error: `Webhook Error: ${message}` });
    return;
  }

  // Acknowledge verified Stripe webhook events cleanly
  console.log(`Stripe webhook verified on Vercel: ${event.type} (${event.id})`);
  sendJson(res, 200, { received: true, type: event.type });
}
