import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  createManagerLink,
  getContactRequest,
  getDirectContactMessage,
  getMenuRoute,
  MENU_TEXT,
} from '../src/menu.js';
import { normalizePhone } from '../src/config.js';
import { createReport } from '../src/report.js';
import { createStore } from '../src/store.js';

test('el menú ofrece las cuatro opciones acordadas', () => {
  assert.match(MENU_TEXT, /GESTION Y ATENCION DE CLIENTES/);
  assert.match(MENU_TEXT, /\*1\.\* Solicitar un vehículo/);
  assert.match(MENU_TEXT, /\*2\.\* Hacer un nuevo pedido/);
  assert.match(MENU_TEXT, /\*3\.\* Consultar dónde va mi pedido/);
  assert.match(MENU_TEXT, /\*4\.\* Hablar con el coordinador/);
});

test('las selecciones llevan a los gestores configurados', () => {
  assert.deepEqual(getMenuRoute('1'), {
    type: 'route', category: 'vehiculo', managerKey: 'vehicle', label: 'solicitar un vehículo',
  });
  assert.deepEqual(getMenuRoute('3'), {
    type: 'route', category: 'ultima_milla', managerKey: 'lastMile', label: 'consultar tu pedido',
  });
});

test('se puede regresar al menú y cancelar una solicitud', () => {
  assert.equal(getMenuRoute('menú').type, 'menu');
  assert.equal(getMenuRoute('CANCELAR').type, 'cancel');
});

test('el enlace al gestor incluye el código y detalles codificados', () => {
  const link = createManagerLink('573122724152', 12, 'Origen: Bogotá & destino: Cali');
  assert.match(link, /^https:\/\/wa\.me\/573122724152\?text=/);
  assert.match(decodeURIComponent(link), /GESTION Y ATENCION DE CLIENTES #12/);
  assert.match(decodeURIComponent(link), /Origen: Bogotá & destino: Cali/);
});

test('la opción de vehículo dirige directamente al WhatsApp del gestor', () => {
  const contact = getContactRequest(getMenuRoute('1'));
  const link = createManagerLink(
    '573122724152',
    12,
    contact.message,
  );
  const message = getDirectContactMessage(contact.label, 'Diego', link);
  assert.match(message, /directamente con \*Diego\*/);
  assert.match(message, /https:\/\/wa\.me\/573122724152/);
  assert.match(message, /toca \*Enviar\*/);
});

test('las cuatro opciones generan enlace directo con texto de contacto', () => {
  const managers = {
    1: '573122724152',
    2: '573102146053',
    3: '573122701373',
    4: '573122701373',
  };
  const expectedText = {
    1: /solicitar un vehículo/i,
    2: /nuevo pedido/i,
    3: /dónde va mi pedido/i,
    4: /coordinador/i,
  };

  for (const [option, phone] of Object.entries(managers)) {
    const route = getMenuRoute(option);
    const contact = getContactRequest(route);
    const link = createManagerLink(phone, 20, contact.message);
    const message = getDirectContactMessage(contact.label, 'Gestor', link);
    assert.ok(link.startsWith(`https://wa.me/${phone}?text=`));
    assert.match(decodeURIComponent(link), expectedText[option]);
    assert.match(message, /toca \*Enviar\*/);
  }
});

test('normaliza celulares con código de país', () => {
  assert.equal(normalizePhone('+57 312 270 1373'), '573122701373');
  assert.throws(() => normalizePhone('123'), /Número de WhatsApp inválido/);
});

test('registra, completa y conserva solicitudes con control del gestor', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'allmar-test-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'requests.json');
  const store = createStore(file);

  const id = store.createRequest({
    customerPhone: '573001112233',
    category: 'pedido',
    managerName: 'Nayide',
    managerPhone: '573102146053',
  });
  assert.equal(store.getLatestAwaiting('573001112233').id, id);
  assert.equal(store.saveDetails(id, 'Dos cajas'), true);
  assert.equal(store.markAttended(id, '573122701373').result, 'wrong_manager');
  assert.equal(store.markAttended(id, '573102146053').result, 'attended');
  store.close();

  const reopened = createStore(file);
  assert.equal(reopened.getRequest(id).status, 'attended');
  assert.equal(reopened.getRequest(id).details, 'Dos cajas');
  reopened.close();
});

test('genera un libro Excel con resumen y minutos de espera', async () => {
  const buffer = await createReport([{
    id: 7,
    customer_phone: '573001112233',
    category: 'pedido',
    manager_name: 'Nayide',
    manager_phone: '573102146053',
    details: 'Dos cajas',
    status: 'attended',
    created_at: '2026-10-23T10:00:00.000Z',
    attended_at: '2026-10-23T10:12:00.000Z',
  }]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assert.equal(workbook.getWorksheet('Resumen').getCell('B5').value, 1);
  assert.equal(workbook.getWorksheet('Resumen').getCell('B7').value, 12);
  assert.equal(workbook.getWorksheet('Solicitudes').getCell('J2').value, 12);
});
