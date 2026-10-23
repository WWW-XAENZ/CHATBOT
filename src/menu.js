export const MENU_TEXT = [
  '👋 *¡Hola! Bienvenido/a a GESTION Y ATENCION DE CLIENTES.*',
  '',
  '¿En qué te podemos ayudar hoy?',
  '',
  '🚚 *1.* Solicitar un vehículo',
  '📦 *2.* Hacer un nuevo pedido',
  '🔎 *3.* Consultar dónde va mi pedido (Última Milla)',
  '👤 *4.* Hablar con el coordinador',
  '',
  '✍️ Escribe el *número* de la opción que necesitas.',
  'Escribe *MENU* en cualquier momento para volver a este menú.',
].join('\n');

const routes = {
  1: { category: 'vehiculo', managerKey: 'vehicle', label: 'solicitar un vehículo' },
  2: { category: 'pedido', managerKey: 'order', label: 'hacer un nuevo pedido' },
  3: { category: 'ultima_milla', managerKey: 'lastMile', label: 'consultar tu pedido' },
  4: { category: 'coordinador', managerKey: 'coordinator', label: 'hablar con el coordinador' },
};

export function getMenuRoute(value) {
  const normalized = String(value).trim().toLocaleLowerCase('es');
  if (normalized === 'menu' || normalized === 'menú' || normalized === 'hola' || normalized === '0') {
    return { type: 'menu' };
  }
  if (normalized === 'cancelar') {
    return { type: 'cancel' };
  }
  const route = routes[normalized];
  return route ? { type: 'route', ...route } : { type: 'unknown' };
}

export function createManagerLink(phone, requestId, details) {
  const text = `Hola, necesito ayuda con mi solicitud GESTION Y ATENCION DE CLIENTES #${requestId}. ${details}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function getDirectContactMessage(label, managerName, link) {
  return [
    `${label} Comunícate directamente con *${managerName}* por WhatsApp:`,
    link,
    '',
    'Al abrir el enlace, toca *Enviar* para iniciar el chat.',
    'Escribe *MENU* si quieres volver al menú.',
  ].join('\n');
}

export function getContactRequest(route) {
  const requests = {
    vehiculo: {
      label: '🚚 Para solicitar un vehículo,',
      message: 'Hola, quiero solicitar un vehículo. ¿Me puedes ayudar?',
    },
    pedido: {
      label: '📦 Para hacer un nuevo pedido,',
      message: 'Hola, quiero hacer un nuevo pedido. ¿Me puedes ayudar?',
    },
    ultima_milla: {
      label: '🔎 Para consultar dónde va mi pedido (Última Milla),',
      message: 'Hola, quiero consultar dónde va mi pedido. Mi número de pedido o guía es:',
    },
    coordinador: {
      label: '👤 Para comunicarte con el coordinador,',
      message: 'Hola, quiero comunicarme con el coordinador. ¿Me puedes ayudar?',
    },
  };
  return requests[route.category];
}
