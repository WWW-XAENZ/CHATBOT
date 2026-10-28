import { isSupabaseConfigured, loadAnalytics, loadReviews, recordAnalytics, signIn } from './supabase.js';

const contacts = {
  vehicle: {
    label: 'solicitar un vehículo',
    manager: 'Diego',
    phone: '573122724152',
    prompt: 'Claro. ¿Qué tipo de vehículo necesitas? Cuéntame también el origen, el destino y la fecha u hora, si ya los sabes.',
    message: 'Hola Diego, quiero solicitar un vehículo.',
  },
  order: {
    label: 'hacer un nuevo pedido',
    manager: 'Nayide',
    phone: '573102146053',
    prompt: 'Con gusto. Cuéntame qué necesitas pedir y agrega los detalles importantes, como cantidades, lugar o fecha.',
    message: 'Hola Nayide, quiero hacer un nuevo pedido.',
  },
  tracking: {
    label: 'consultar dónde va tu pedido',
    manager: 'el equipo de Última Milla',
    phone: '573122701373',
    prompt: 'Te ayudo con eso. ¿Cuál es el número de pedido o de guía?',
    message: 'Hola, quiero consultar dónde va mi pedido.',
  },
  coordinator: {
    label: 'hablar con el coordinador',
    manager: 'el coordinador',
    phone: '573122701373',
    prompt: 'Claro, cuéntame brevemente en qué necesitas ayuda y te conecto con el coordinador.',
    message: 'Hola, quiero comunicarme con el coordinador.',
  },
};

const options = [
  { key: 'vehicle', label: '🚚 Solicitar un vehículo' },
  { key: 'order', label: '📦 Hacer un nuevo pedido' },
  { key: 'tracking', label: '🔎 Consultar mi pedido' },
  { key: 'coordinator', label: '👤 Hablar con el coordinador' },
];

const messages = document.querySelector('#messages');
const quickReplies = document.querySelector('#quick-replies');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#chat-input');
const sendButton = form.querySelector('.send-button');
const reportDialog = document.querySelector('#report-dialog');
const reportContent = document.querySelector('#report-content');
const reportStatus = document.querySelector('#report-status');
const reportExport = document.querySelector('#report-export');
const reportLoginForm = document.querySelector('#report-login-form');
const reportLogout = document.querySelector('#report-logout');
const reportCopyReviewLink = document.querySelector('#report-copy-review-link');
const reportDashboard = document.querySelector('#report-dashboard');
const reviewReportContent = document.querySelector('#review-report-content');
const logoTrigger = document.querySelector('#logo-trigger');
let selectedContact = null;
let isReplying = false;
let pendingReplyStartedAt = null;
let reportAccessToken = null;
let logoClickCount = 0;
let logoClickTimer = null;
const visitStartedAt = Date.now();
const sessionId = globalThis.crypto?.randomUUID
  ? globalThis.crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    return (character === 'x' ? randomValue : (randomValue & 0x3) | 0x8).toString(16);
  });

function recordVisitEvent(eventType, details = {}) {
  if (!isSupabaseConfigured) return;
  recordAnalytics({
    session_id: sessionId,
    event_type: eventType,
    ...details,
  }).catch((error) => {
    console.error('No se pudo registrar la métrica anónima en Supabase.', error);
    if (reportDialog.open) showReportError(error);
  });
}

function showReportError(error) {
  reportStatus.textContent = `No se pudo completar la operación: ${error.message}`;
}

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

function addMessage(text, sender = 'bot', link = null) {
  const message = document.createElement('div');
  message.className = `message ${sender}`;
  message.textContent = text;

  if (link) {
    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = `Abrir WhatsApp con ${link.manager} ↗`;
    let isOpeningWhatsApp = false;
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      if (isOpeningWhatsApp) return;
      isOpeningWhatsApp = true;
      const countdownStartedAt = Date.now();

      const whatsappWindow = window.open('about:blank', '_blank');
      if (!whatsappWindow) {
        const status = document.createElement('span');
        status.setAttribute('role', 'status');
        message.append(document.createElement('br'), status);
        let secondsRemaining = 5;
        status.textContent = `Abriendo WhatsApp en esta pestaña en ${secondsRemaining} segundos...`;
        const countdown = window.setInterval(() => {
          secondsRemaining -= 1;
          if (secondsRemaining === 0) {
            window.clearInterval(countdown);
            recordVisitEvent('whatsapp_open', { wait_ms: Date.now() - countdownStartedAt });
            window.location.href = link.url;
            return;
          }
          status.textContent = `Abriendo WhatsApp en esta pestaña en ${secondsRemaining} segundos...`;
        }, 1000);
        return;
      }

      whatsappWindow.opener = null;
      whatsappWindow.document.title = 'Abriendo WhatsApp';
      const style = whatsappWindow.document.createElement('style');
      style.textContent = 'body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#f3f8fc;color:#173f70;font:600 18px system-ui,sans-serif;text-align:center}p{max-width:360px;line-height:1.6}';
      whatsappWindow.document.head.append(style);
      const status = whatsappWindow.document.createElement('p');
      whatsappWindow.document.body.append(status);

      let secondsRemaining = 5;
      status.textContent = `Abriendo la conversación de WhatsApp en ${secondsRemaining} segundos...`;
      const countdown = window.setInterval(() => {
        if (whatsappWindow.closed) {
          window.clearInterval(countdown);
          return;
        }

        secondsRemaining -= 1;
        if (secondsRemaining === 0) {
          window.clearInterval(countdown);
          recordVisitEvent('whatsapp_open', { wait_ms: Date.now() - countdownStartedAt });
          whatsappWindow.location.href = link.url;
          return;
        }

        status.textContent = `Abriendo la conversación de WhatsApp en ${secondsRemaining} segundos...`;
      }, 1000);
    });
    message.append(document.createElement('br'), anchor);
  }

  messages.append(message);
  messages.scrollTop = messages.scrollHeight;
}

function setReplying(replying) {
  isReplying = replying;
  input.disabled = replying;
  sendButton.disabled = replying;
  quickReplies.querySelectorAll('button').forEach((button) => {
    button.disabled = replying;
  });
}

function reply(text, replies = [], link = null) {
  if (isReplying) return;
  const replyStartedAt = pendingReplyStartedAt;
  pendingReplyStartedAt = null;
  setReplying(true);

  const typing = document.createElement('div');
  typing.className = 'message typing-indicator';
  typing.setAttribute('role', 'status');
  typing.setAttribute('aria-label', 'El asistente está escribiendo');
  typing.innerHTML = '<span></span><span></span><span></span>';
  messages.append(typing);
  messages.scrollTop = messages.scrollHeight;

  const delay = Math.min(1400, Math.max(550, text.length * 11));
  window.setTimeout(() => {
    typing.remove();
    if (replyStartedAt !== null) {
      recordVisitEvent('assistant_reply', { wait_ms: Date.now() - replyStartedAt });
    }
    addMessage(text, 'bot', link);
    showQuickReplies(replies);
    setReplying(false);
    input.focus();
  }, delay);
}

function showQuickReplies(replies) {
  quickReplies.replaceChildren();
  for (const reply of replies) {
    const button = document.createElement('button');
    button.className = 'quick-reply';
    button.type = 'button';
    button.textContent = reply.label;
    button.addEventListener('click', () => handleMessage(reply.displayText ?? reply.value));
    quickReplies.append(button);
  }
}

function menuReplies() {
  return options.map(({ key, label }) => ({
    label,
    value: key,
    displayText: label,
  }));
}

function showMenu() {
  selectedContact = null;
  reply(
    `${chatLogic.getColombiaGreeting()} 👋 Soy el asistente virtual de Gestión y Atención de Clientes. ¿En qué te puedo ayudar hoy? Puedes escribirme con tus propias palabras o elegir una opción.`,
    menuReplies(),
  );
}

function detectOption(text) {
  const value = normalize(text);
  if (Object.prototype.hasOwnProperty.call(contacts, value)) {
    return value;
  }
  const numberedOption = value.match(/^([1-4])[.)]?$/);
  if (numberedOption) {
    return ['vehicle', 'order', 'tracking', 'coordinator'][Number(numberedOption[1]) - 1];
  }
  if (
    /^(vehiculo|vehiculos|carro|camion|transporte)$/.test(value)
    || (/\b(vehiculo|carro|camion|transporte)\b/.test(value) && /\b(solicitar|necesito|quiero|pedir)\b/.test(value))
  ) {
    return 'vehicle';
  }
  if (
    /^(pedido|pedidos|orden|comprar)$/.test(value)
    || (/\b(pedido|orden)\b/.test(value) && /\b(nuevo|hacer|realizar|quiero|necesito|pedir)\b/.test(value))
  ) {
    return 'order';
  }
  if (/^(seguimiento|rastreo|guia)$/.test(value) || /\b(donde va|estado de mi pedido|seguir mi pedido|ultima milla|consultar mi pedido)\b/.test(value)) {
    return 'tracking';
  }
  if (/^(coordinador|asesor|persona|humano)$/.test(value) || /\b(hablar|comunicarme|contactar|quiero una persona|necesito una persona)\b.*\b(coordinador|asesor|persona|humano)?\b/.test(value)) {
    return 'coordinator';
  }
  return null;
}

function startRequest(key) {
  selectedContact = contacts[key];
  reply(
    `Entiendo, quieres ${selectedContact.label}. ${selectedContact.prompt}`,
    [
      { label: '↩ Menú principal', value: 'menu' },
      { label: 'Cancelar', value: 'cancelar' },
    ],
  );
}

function createWhatsAppLink(contact, details) {
  const text = `${contact.message} ${details}`.trim();
  return `https://wa.me/${contact.phone}?text=${encodeURIComponent(text)}`;
}

function handleMessage(rawText) {
  if (isReplying) return;
  const text = rawText.trim();
  if (!text) return;
  pendingReplyStartedAt = Date.now();
  addMessage(text, 'user');

  const normalized = normalize(text);
  if (['menu', 'menú', 'inicio'].includes(normalized)) {
    selectedContact = null;
    reply(
      'Claro, volvamos al inicio. ¿Qué necesitas hacer?',
      menuReplies(),
    );
    return;
  }
  if (/^(hola+|holi+|buenos dias|buenas tardes|buenas noches|buen dia|buenas|hey|que tal|saludos)[!. ]*$/.test(normalized)) {
    reply(`${chatLogic.getColombiaGreeting()} 👋 ¡Qué gusto saludarte! ¿En qué te puedo ayudar hoy?`, menuReplies());
    return;
  }
  if (normalized === 'cancelar') {
    selectedContact = null;
    reply('Listo, cancelé esta solicitud. ¿En qué más te puedo ayudar?', menuReplies());
    return;
  }

  if (/^(gracias|muchas gracias|te agradezco|perfecto gracias|ok gracias)[!. ]*$/.test(normalized)) {
    reply('¡Con mucho gusto! 😊 Si necesitas algo más, aquí estoy para ayudarte.', menuReplies());
    return;
  }
  if (/^(chao|adios|hasta luego|nos vemos|bye)[!. ]*$/.test(normalized)) {
    reply('¡Hasta luego! Gracias por comunicarte con Gestión y Atención de Clientes. 👋', []);
    return;
  }
  if (/\b(quien eres|que eres|eres una ia|eres un robot|que puedes hacer|como me ayudas|ayuda)\b/.test(normalized)) {
    reply(
      'Soy el asistente virtual de Gestión y Atención de Clientes. Puedo orientarte para solicitar vehículos, hacer pedidos, consultar su seguimiento y preparar una solicitud para el coordinador. Para cuidar la precisión, no invento tarifas, horarios ni estados de envío; esos datos te los confirma el equipo.',
      menuReplies(),
    );
    return;
  }

  if (selectedContact) {
    const contact = selectedContact;
    selectedContact = null;
    const details = text.slice(0, 1000);
    const link = createWhatsAppLink(contact, details);
    reply(
      `Gracias por los detalles. Preparé un mensaje para ${contact.manager}. Revísalo y envíalo desde WhatsApp para continuar.`,
      [
        { label: '↩ Menú principal', value: 'menu' },
        { label: 'Otra consulta', value: 'hola' },
      ],
      { url: link, manager: contact.manager },
    );
    return;
  }

  const option = detectOption(text);
  if (option) {
    startRequest(option);
    return;
  }

  const value = normalize(text);
  if (/\b(horario|precio|tarifa|direccion|ubicacion|servicios)\b/.test(value)) {
    reply(
      'Quiero darte información correcta, pero no tengo datos confirmados sobre horarios, tarifas o ubicaciones. Si me cuentas qué necesitas, preparo tu consulta para que el coordinador te ayude.',
      [
      {
        label: '👤 Hablar con el coordinador',
        value: 'coordinator',
        displayText: 'Hablar con el coordinador',
      },
      ...options.slice(0, 3).map(({ key, label }) => ({
        label,
        value: key,
        displayText: label,
      })),
      ],
    );
    return;
  }

  reply(
    'Puedo orientarte con vehículos, pedidos, seguimiento y contacto con el coordinador. No tengo acceso a internet ni a información en tiempo real, así que no quiero inventar una respuesta. Cuéntame un poco más o elige una opción y te ayudaré a continuar.',
    menuReplies(),
  );
}

function formatDuration(milliseconds) {
  if (!milliseconds) return '0 s';
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

function average(values) {
  return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

function createReportCell(row, text, tagName = 'td') {
  const cell = document.createElement(tagName);
  cell.textContent = text;
  row.append(cell);
}

function groupAnalytics(events) {
  const sessions = new Map();
  for (const event of events) {
    let session = sessions.get(event.session_id);
    if (!session) {
      session = {
        id: event.session_id,
        enteredAt: null,
        durationMs: null,
        assistantWaits: [],
        whatsappWaits: [],
      };
      sessions.set(event.session_id, session);
    }

    if (event.event_type === 'visit_start') session.enteredAt = event.occurred_at;
    if (event.event_type === 'visit_end') session.durationMs = event.duration_ms;
    if (event.event_type === 'assistant_reply' && Number.isFinite(event.wait_ms)) session.assistantWaits.push(event.wait_ms);
    if (event.event_type === 'whatsapp_open' && Number.isFinite(event.wait_ms)) session.whatsappWaits.push(event.wait_ms);
  }
  return [...sessions.values()].sort((first, second) => (second.enteredAt ?? '').localeCompare(first.enteredAt ?? ''));
}

function renderSessions(sessions) {
  reportContent.replaceChildren();
  const assistantWaits = sessions.flatMap((session) => session.assistantWaits);
  const whatsappWaits = sessions.flatMap((session) => session.whatsappWaits);
  const summary = document.createElement('div');
  summary.className = 'report-summary';
  const cards = [
    ['Visitas registradas', String(sessions.length)],
    ['Espera media del asistente', assistantWaits.length ? `${average(assistantWaits)} ms` : 'Sin datos'],
    ['Espera media para WhatsApp', whatsappWaits.length ? formatDuration(average(whatsappWaits)) : 'Sin datos'],
  ];
  for (const [label, value] of cards) {
    const card = document.createElement('div');
    card.className = 'report-stat';
    const title = document.createElement('span');
    title.textContent = label;
    const amount = document.createElement('strong');
    amount.textContent = value;
    card.append(title, amount);
    summary.append(card);
  }
  reportContent.append(summary);

  const table = document.createElement('table');
  table.className = 'report-table';
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const label of ['Visita anónima', 'Fecha y hora', 'Tiempo en página', 'Espera del asistente', 'Espera de WhatsApp']) {
    createReportCell(headerRow, label, 'th');
  }
  head.append(headerRow);
  const body = document.createElement('tbody');
  for (const session of sessions) {
    const row = document.createElement('tr');
    const enteredAt = session.enteredAt ? new Date(session.enteredAt) : null;
    const assistantWait = average(session.assistantWaits);
    const whatsappWait = average(session.whatsappWaits);
    createReportCell(row, session.id.slice(-6));
    createReportCell(row, !enteredAt || Number.isNaN(enteredAt.getTime()) ? 'Fecha no disponible' : new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(enteredAt));
    createReportCell(row, session.durationMs === null ? 'En curso' : formatDuration(session.durationMs));
    createReportCell(row, assistantWait === null ? '—' : `${assistantWait} ms`);
    createReportCell(row, whatsappWait === null ? '—' : formatDuration(whatsappWait));
    body.append(row);
  }
  table.append(head, body);
  const tableWrap = document.createElement('div');
  tableWrap.className = 'report-table-wrap';
  tableWrap.append(table);
  reportContent.append(tableWrap);
  reportExport.disabled = sessions.length === 0;
}

function renderReviews(reviews) {
  reviewReportContent.replaceChildren();
  const averageRating = average(reviews.map((review) => review.rating));
  const heading = document.createElement('p');
  heading.className = 'review-summary';
  heading.textContent = reviews.length
    ? `${reviews.length} reseñas · calificación promedio ${averageRating}/5`
    : 'Aún no hay reseñas.';
  reviewReportContent.append(heading);
  for (const review of reviews) {
    const article = document.createElement('article');
    article.className = 'review-report-card';
    const rating = document.createElement('strong');
    rating.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} · ${review.rating}/5`;
    const date = document.createElement('time');
    date.dateTime = review.created_at;
    date.textContent = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(review.created_at));
    const comment = document.createElement('p');
    comment.textContent = review.comment || 'Sin comentario escrito.';
    article.append(rating, date, comment);
    reviewReportContent.append(article);
  }
}

async function loadReport() {
  if (!reportAccessToken) return;
  reportStatus.textContent = 'Cargando datos de Supabase…';
  reportExport.disabled = true;
  try {
    const [events, reviews] = await Promise.all([
      loadAnalytics(reportAccessToken),
      loadReviews(reportAccessToken),
    ]);
    const sessions = groupAnalytics(events);
    renderSessions(sessions);
    renderReviews(reviews);
    reportStatus.textContent = 'Informe centralizado. Las métricas son anónimas y no incluyen mensajes del chat.';
    reportLoginForm.hidden = true;
    reportDashboard.hidden = false;
  } catch (error) {
    reportStatus.textContent = error.message;
    reportLoginForm.hidden = false;
    reportDashboard.hidden = true;
  }
}

async function exportReport() {
  if (!reportAccessToken) return;
  try {
    const sessions = groupAnalytics(await loadAnalytics(reportAccessToken));
    const rows = [
      ['ID anónimo', 'Fecha de entrada', 'Tiempo en página (ms)', 'Espera media del asistente (ms)', 'Espera media WhatsApp (ms)'],
      ...sessions.map((session) => [
        session.id,
        session.enteredAt ?? '',
        session.durationMs ?? '',
        average(session.assistantWaits) ?? '',
        average(session.whatsappWaits) ?? '',
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'informe-visitas-anonimo.csv';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    reportStatus.textContent = 'Se generó el CSV. Si no aparece, revisa las descargas del navegador.';
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    showReportError(error);
  }
}

function openAdminReport() {
  if (!isSupabaseConfigured) {
    reportStatus.textContent = 'Configura la URL y la clave pública de Supabase en supabase-config.js para activar el informe.';
    reportLoginForm.hidden = true;
    reportDashboard.hidden = true;
  } else {
    reportLoginForm.hidden = false;
    reportDashboard.hidden = true;
    reportStatus.textContent = 'Inicia sesión con una cuenta de administrador de Supabase.';
  }
  reportDialog.showModal();
  if (reportAccessToken) loadReport();
}

reportLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  reportStatus.textContent = 'Validando acceso…';
  const submitButton = reportLoginForm.querySelector('button[type="submit"]');
  const passwordInput = reportLoginForm.elements.namedItem('password');
  if (!(passwordInput instanceof HTMLInputElement)) {
    reportStatus.textContent = 'No se encontró el campo de contraseña. Recarga la página e inténtalo de nuevo.';
    return;
  }
  submitButton.disabled = true;
  try {
    const session = await signIn(passwordInput.value);
    reportAccessToken = session.access_token;
    passwordInput.value = '';
    await loadReport();
  } catch (error) {
    reportStatus.textContent = `No se pudo iniciar sesión: ${error.message}`;
  } finally {
    submitButton.disabled = false;
  }
});

reportLogout.addEventListener('click', () => {
  reportAccessToken = null;
  reportLoginForm.hidden = false;
  reportDashboard.hidden = true;
  reportContent.replaceChildren();
  reviewReportContent.replaceChildren();
  reportDialog.close();
});
reportCopyReviewLink.addEventListener('click', async () => {
  const reviewUrl = new URL('./reviews.html', window.location.href).href;
  try {
    await navigator.clipboard.writeText(reviewUrl);
    reportStatus.textContent = 'Enlace de reseñas copiado. El equipo puede enviarlo manualmente al cliente por WhatsApp.';
  } catch (error) {
    reportStatus.textContent = `Copia este enlace y envíalo al cliente por WhatsApp: ${reviewUrl}. Detalle: ${error.message}`;
  }
});
reportExport.addEventListener('click', exportReport);
reportDialog.querySelector('.report-close').addEventListener('click', () => reportDialog.close());
logoTrigger.addEventListener('click', () => {
  logoClickCount += 1;
  window.clearTimeout(logoClickTimer);
  if (logoClickCount === 5) {
    logoClickCount = 0;
    openAdminReport();
    return;
  }
  logoClickTimer = window.setTimeout(() => {
    logoClickCount = 0;
  }, 2500);
});
window.addEventListener('pagehide', () => {
  recordVisitEvent('visit_end', { duration_ms: Math.max(0, Date.now() - visitStartedAt) });
});
recordVisitEvent('visit_start');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (isReplying) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  handleMessage(text);
});

pendingReplyStartedAt = visitStartedAt;
showMenu();
