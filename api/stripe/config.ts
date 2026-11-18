import type { IncomingMessage, ServerResponse } from 'node:http';

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  sendJson(res, 200, {
    configured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    hasMonthlyPriceId: Boolean(process.env.STRIPE_PRICE_ID_MONTHLY?.trim()),
    hasAnnualPriceId: Boolean(process.env.STRIPE_PRICE_ID_ANNUAL?.trim()),
  });
}
