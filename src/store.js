import fs from 'node:fs';
import path from 'node:path';

export function createStore(databasePath) {
  const resolvedPath = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  let requests = [];

  if (fs.existsSync(resolvedPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      if (!Array.isArray(saved)) throw new Error('El archivo de solicitudes debe contener una lista.');
      requests = saved;
    } catch (error) {
      throw new Error(`No se pudo leer el registro ${resolvedPath}: ${error.message}`);
    }
  }

  function persist() {
    const temporaryPath = `${resolvedPath}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(requests, null, 2), 'utf8');
    fs.renameSync(temporaryPath, resolvedPath);
  }

  return {
    createRequest({ customerPhone, category, managerName, managerPhone }) {
      const id = requests.reduce((highest, request) => Math.max(highest, request.id), 0) + 1;
      requests.push({
        id,
        customer_phone: customerPhone,
        category,
        manager_name: managerName,
        manager_phone: managerPhone,
        details: '',
        status: 'awaiting_details',
        created_at: new Date().toISOString(),
        attended_at: null,
      });
      persist();
      return id;
    },
    getLatestAwaiting(customerPhone) {
      return requests
        .filter((request) => request.customer_phone === customerPhone && request.status === 'awaiting_details')
        .at(-1);
    },
    saveDetails(requestId, details) {
      const request = requests.find((item) => item.id === requestId && item.status === 'awaiting_details');
      if (!request) return false;
      request.details = details;
      request.status = 'pending';
      persist();
      return true;
    },
    cancelAwaiting(customerPhone) {
      const awaiting = requests.filter((request) =>
        request.customer_phone === customerPhone && request.status === 'awaiting_details');
      for (const request of awaiting) request.status = 'cancelled';
      if (awaiting.length) persist();
      return awaiting.length;
    },
    getRequest(requestId) {
      return requests.find((request) => request.id === requestId);
    },
    markAttended(requestId, managerPhone) {
      const request = requests.find((item) => item.id === requestId);
      if (!request || request.status !== 'pending') return { result: 'not_pending' };
      if (request.manager_phone !== managerPhone) return { result: 'wrong_manager', request };
      request.status = 'attended';
      request.attended_at = new Date().toISOString();
      persist();
      return { result: 'attended', request };
    },
    getReportRows: () => requests.slice().sort((left, right) => right.id - left.id),
    close() {},
  };
}
