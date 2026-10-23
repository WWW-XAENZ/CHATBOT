import crypto from 'node:crypto';
import express from 'express';
import { loadConfig } from './config.js';
import {
  createManagerLink,
  getContactRequest,
  getDirectContactMessage,
  getMenuRoute,
  MENU_TEXT,
} from './menu.js';
import { createReport } from './report.js';
import { createStore } from './store.js';

const config = loadConfig();
const store = createStore(config.databasePath);
const app = express();

app.get('/healthz', (_request, response) => response.json({ status: 'ok' }));

app.get('/webhook', (request, response) => {
  const mode = request.query['hub.mode'];
  const token = request.query['hub.verify_token'];
  const challenge = request.query['hub.challenge'];
  if (mode === 'subscribe' && token === config.verifyToken && typeof challenge === 'string') {
    return response.status(200).send(challenge);
  }
  return response.sendStatus(403);
});

app.post('/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (request, response) => {
  const signature = request.header('x-hub-signature-256');
  if (!isValidSignature(request.body, signature, config.appSecret)) {
    return response.sendStatus(401);
  }

  let payload;
  try {
    payload = JSON.parse(request.body.toString('utf8'));
  } catch (error) {
    console.error('Webhook de Meta con JSON inválido:', error.message);
    return response.sendStatus(400);
  }

  response.sendStatus(200);
  void handleWebhook(payload).catch((error) => {
    console.error('Error procesando webhook de WhatsApp:', error);
  });
});

app.get('/admin/report.xlsx', async (request, response, next) => {
  if (request.header('authorization') !== `Bearer ${config.reportToken}`) {
    return response.sendStatus(401);
  }
  try {
    const buffer = await createReport(store.getReportRows());
    response
      .set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .set('Content-Disposition', 'attachment; filename="informe-gestion-atencion-clientes.xlsx"')
      .send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error('Error HTTP:', error);
  response.sendStatus(500);
});

function isValidSignature(body, signature, secret) {
  if (!Buffer.isBuffer(body) || !signature?.startsWith('sha256=')) return false;
  const supplied = Buffer.from(signature.slice(7), 'hex');
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`;
  const result = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  if (!result.ok) {
    const body = await result.text();
    throw new Error(`Meta Graph API respondió ${result.status}: ${body}`);
  }
}

async function processMessage(message) {
  const sender = String(message.from || '').replace(/\D/g, '');
  if (!sender) return;

  const text = (message.text?.body
    ?? message.interactive?.button_reply?.id
    ?? message.interactive?.list_reply?.id
    ?? '').trim();
  if (!text) {
    await sendWhatsAppMessage(sender, `Por ahora solo puedo recibir texto.\n\n${MENU_TEXT}`);
    return;
  }

  const attendedMatch = text.match(/^ATENDIDO\s+(\d+)$/i);
  if (attendedMatch) {
    const result = store.markAttended(Number(attendedMatch[1]), sender);
    const replies = {
      attended: `¡Gracias! La solicitud #${attendedMatch[1]} quedó marcada como atendida.`,
      wrong_manager: 'Ese código está asignado a otro gestor.',
      not_pending: 'No encontré una solicitud pendiente con ese código.',
    };
    await sendWhatsAppMessage(sender, replies[result.result]);
    return;
  }

  const awaiting = store.getLatestAwaiting(sender);
  if (awaiting && !['menu', 'menú', 'cancelar', '0'].includes(text.toLocaleLowerCase('es'))) {
    store.saveDetails(awaiting.id, text.slice(0, 2000));
    const link = createManagerLink(awaiting.manager_phone, awaiting.id, text.slice(0, 1000));
    await sendWhatsAppMessage(
      sender,
      `Gracias. Registré tu solicitud #${awaiting.id} para ${awaiting.manager_name}.\n` +
      `Continúa por WhatsApp aquí: ${link}\n\n` +
      `Cuando te atienda, ${awaiting.manager_name} registrará el tiempo enviando al bot: ` +
      `ATENDIDO ${awaiting.id}\n\nEscribe MENU para volver al menú.`,
    );
    return;
  }

  const selection = getMenuRoute(text);
  if (selection.type === 'menu') {
    store.cancelAwaiting(sender);
    await sendWhatsAppMessage(sender, MENU_TEXT);
    return;
  }
  if (selection.type === 'cancel') {
    store.cancelAwaiting(sender);
    await sendWhatsAppMessage(sender, `Solicitud cancelada.\n\n${MENU_TEXT}`);
    return;
  }
  if (selection.type === 'unknown') {
    await sendWhatsAppMessage(sender, `No reconocí esa opción.\n\n${MENU_TEXT}`);
    return;
  }

  const manager = config.managers[selection.managerKey];
  const requestId = store.createRequest({
    customerPhone: sender,
    category: selection.category,
    managerName: manager.name,
    managerPhone: manager.phone,
  });

  const contactRequest = getContactRequest(selection);
  const link = createManagerLink(manager.phone, requestId, contactRequest.message);
  store.saveDetails(requestId, contactRequest.message);
  await sendWhatsAppMessage(
    sender,
    getDirectContactMessage(contactRequest.label, manager.name, link),
  );
}

async function handleWebhook(payload) {
  const messages = (payload.entry || [])
    .flatMap((entry) => entry.changes || [])
    .flatMap((change) => change.value?.messages || []);
  for (const message of messages) {
    await processMessage(message);
  }
}

const server = app.listen(config.port, () => {
  console.log(`GESTION Y ATENCION DE CLIENTES WhatsApp bot escuchando en el puerto ${config.port}`);
});

function shutdown() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
