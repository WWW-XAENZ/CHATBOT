import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { getColombiaGreeting } = require('../chat-logic.cjs');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const supabase = fs.readFileSync(new URL('../supabase.js', import.meta.url), 'utf8');
const schema = fs.readFileSync(new URL('../supabase-schema.sql', import.meta.url), 'utf8');
const reviewsHtml = fs.readFileSync(new URL('../reviews.html', import.meta.url), 'utf8');
const reviewsScript = fs.readFileSync(new URL('../reviews.js', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('la página muestra una interfaz de conversación con entrada accesible', () => {
  assert.match(html, /Gestión y Atención de Clientes/i);
  assert.match(html, /class="logo" src="\.\//);
  assert.match(html, /Logo-Web-SI3|logo-si3\.png/);
  assert.match(html, /Plus\+Jakarta\+Sans/);
  assert.match(html, /--primary-900:\s*#102d52/i);
  assert.match(html, /Asistente virtual/);
  assert.match(html, /id="messages" role="log" aria-live="polite"/);
  assert.match(html, /id="chat-form"/);
  assert.match(html, /id="chat-input"/);
  assert.match(html, /Al configurar Supabase, registramos solo visitas y tiempos anónimos/);
  assert.match(html, /id="logo-trigger"/);
  assert.match(html, /type="module" src="app\.js"/);
  assert.match(html, /<script src="chat-logic\.cjs"><\/script>/);
  assert.match(html, /<script type="module" src="app\.js"><\/script>/);
});

test('el asistente ofrece cuatro rutas de servicio con los contactos definidos', () => {
  assert.match(script, /vehicle:[\s\S]*?phone: '573122724152'/);
  assert.match(script, /order:[\s\S]*?phone: '573102146053'/);
  assert.match(script, /tracking:[\s\S]*?phone: '573122701373'/);
  assert.match(script, /coordinator:[\s\S]*?phone: '573122701373'/);
});

test('el asistente acepta texto, muestra opciones y prepara enlaces de WhatsApp', () => {
  assert.match(script, /form\.addEventListener\('submit'/);
  assert.match(script, /function detectOption\(text\)/);
  assert.match(script, /function showQuickReplies\(replies\)/);
  assert.match(script, /https:\/\/wa\.me\/\$\{contact\.phone\}\?text=/);
  assert.match(script, /target = '_blank'/);
  assert.match(script, /rel = 'noopener noreferrer'/);
});

test('permite cancelar y regresar al menú sin registrar el texto enviado', () => {
  assert.match(script, /normalized === 'cancelar'/);
  assert.match(script, /\['menu', 'menú', 'inicio'\]/);
  assert.doesNotMatch(script, /sessionStorage|localStorage|JSON\.stringify\(\{[^}]*text/i);
});

test('saluda según la hora de Colombia', () => {
  assert.equal(getColombiaGreeting(new Date('2026-10-23T06:00:00-05:00')), '¡Buenos días!');
  assert.equal(getColombiaGreeting(new Date('2026-10-23T11:59:00-05:00')), '¡Buenos días!');
  assert.equal(getColombiaGreeting(new Date('2026-10-23T12:00:00-05:00')), '¡Buenas tardes!');
  assert.equal(getColombiaGreeting(new Date('2026-10-23T18:59:00-05:00')), '¡Buenas tardes!');
  assert.equal(getColombiaGreeting(new Date('2026-10-23T19:00:00-05:00')), '¡Buenas noches!');
  assert.equal(getColombiaGreeting(new Date('2026-10-23T04:59:00-05:00')), '¡Buenas noches!');
});

test('un saludo escrito recibe la respuesta correspondiente a la hora local del negocio', () => {
  assert.match(script, /buenos dias\|buenas tardes\|buenas noches/);
  assert.match(script, /chatLogic\.getColombiaGreeting\(\).*¿En qué te puedo ayudar hoy/);
});

test('el asistente muestra una pausa de escritura accesible y limita sus capacidades con honestidad', () => {
  assert.match(script, /function reply\(text, replies = \[\], link = null\)/);
  assert.match(script, /className = 'message typing-indicator'/);
  assert.match(script, /aria-label', 'El asistente está escribiendo'/);
  assert.match(script, /window\.setTimeout/);
  assert.match(script, /Math\.min\(1400, Math\.max\(550, text\.length \* 11\)\)/);
  assert.match(script, /quien eres\|que eres\|eres una ia/);
  assert.match(script, /holi\+\|buenos dias/);
  assert.match(script, /No tengo acceso a internet ni a información en tiempo real/);
  assert.match(html, /@keyframes typing-bounce/);
  assert.match(html, /prefers-reduced-motion: reduce/);
});

test('WhatsApp se abre con una cuenta regresiva de cinco segundos', () => {
  assert.match(script, /window\.open\('about:blank', '_blank'\)/);
  assert.match(script, /let secondsRemaining = 5/);
  assert.match(script, /}, 1000\)/);
  assert.match(script, /whatsappWindow\.location\.href = link\.url/);
});

test('el informe centralizado requiere cinco clics y autenticación de administrador', () => {
  assert.match(html, /id="logo-trigger"/);
  assert.match(html, /id="report-dialog"/);
  assert.match(html, /id="report-login-form"/);
  assert.match(html, /Descargar CSV de visitas/);
  assert.match(html, /Copiar enlace de reseñas/);
  assert.match(script, /logoClickCount === 5/);
  assert.match(script, /reportLoginForm\.elements\.namedItem\('password'\)/);
  assert.match(script, /No se encontró el campo de contraseña/);
  assert.match(script, /signIn\(passwordInput\.value\)/);
  assert.doesNotMatch(html, /id="report-email"|Correo de administrador/);
  assert.match(script, /loadAnalytics\(reportAccessToken\)/);
  assert.match(script, /loadReviews\(reportAccessToken\)/);
  assert.match(script, /function groupAnalytics\(events\)/);
  assert.match(supabase, /\/auth\/v1\/token\?grant_type=password/);
  assert.match(supabase, /const adminEmail = config\.adminEmail\?\.trim\(\)/);
  assert.match(supabase, /Bearer \$\{token \?\? publicKey\}/);
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /Allow signed-in report readers/);
  assert.match(schema, /Allow anonymous metric inserts/);
  assert.match(schema, /create table if not exists public\.report_admins/);
  assert.match(schema, /report_admins\.user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(schema, /grant select on public\.(chat_analytics|reviews) to anon/i);
  assert.doesNotMatch(schema, /Allow anonymous report readers/);
});

test('las reseñas son anónimas, se guardan en Supabase y permiten volver al chat', () => {
  assert.match(reviewsHtml, /id="review-form"/);
  assert.match(reviewsHtml, /id="review-success"/);
  assert.match(reviewsHtml, /href="\.\/index\.html"/);
  assert.match(reviewsScript, /recordReview\(\{ rating, comment \}\)/);
  assert.match(schema, /create table if not exists public\.reviews/);
  assert.match(schema, /Allow anonymous review submissions/);
  assert.match(schema, /Allow signed-in review readers/);
  assert.match(readme, /reviews\.html/);
});

test('Supabase registra solo métricas anónimas y la reseña, no los mensajes del chatbot', () => {
  assert.match(script, /recordVisitEvent\('visit_start'\)/);
  assert.match(script, /recordVisitEvent\('visit_end'/);
  assert.match(script, /recordVisitEvent\('assistant_reply'/);
  assert.match(script, /recordVisitEvent\('whatsapp_open'/);
  assert.match(supabase, /chat_analytics/);
  assert.match(supabase, /reviews/);
  assert.match(supabase, /includes\(event\.event_type\)/);
  assert.doesNotMatch(supabase, /localStorage|sessionStorage/);
  assert.match(readme, /service_role/);
  assert.match(readme, /cinco veces/);
  assert.match(readme, /no puede detectar/);
});
