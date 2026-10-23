import 'dotenv/config';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta configurar ${name}. Copia .env.example a .env y completa el valor.`);
  }
  return value;
}

export function loadConfig() {
  const phone = (name) => normalizePhone(required(name));

  return {
    port: Number(process.env.PORT || 3000),
    accessToken: required('META_ACCESS_TOKEN'),
    phoneNumberId: required('META_PHONE_NUMBER_ID'),
    verifyToken: required('META_VERIFY_TOKEN'),
    appSecret: required('META_APP_SECRET'),
    graphApiVersion: process.env.META_GRAPH_API_VERSION || 'v23.0',
    reportToken: required('ADMIN_REPORT_TOKEN'),
    databasePath: process.env.DATABASE_PATH || './data/allmar.json',
    managers: {
      coordinator: { name: 'Coordinador', phone: phone('COORDINATOR_PHONE') },
      lastMile: { name: 'Última Milla', phone: phone('LAST_MILE_PHONE') },
      vehicle: { name: 'Diego', phone: phone('VEHICLE_MANAGER_PHONE') },
      order: { name: 'Nayide', phone: phone('ORDER_MANAGER_PHONE') },
    },
  };
}

export function normalizePhone(value) {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    throw new Error(`Número de WhatsApp inválido: ${value}`);
  }
  return digits;
}
