function getColombiaGreeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Bogota',
  }).format(date));

  if (hour >= 5 && hour < 12) return '¡Buenos días!';
  if (hour >= 12 && hour < 19) return '¡Buenas tardes!';
  return '¡Buenas noches!';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getColombiaGreeting };
}

globalThis.chatLogic = { getColombiaGreeting };
