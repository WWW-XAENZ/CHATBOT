import ExcelJS from 'exceljs';

function minutesBetween(start, end) {
  if (!start || !end) return null;
  return Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60000));
}

export async function createReport(rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GESTION Y ATENCION DE CLIENTES';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Resumen');
  const attended = rows.filter((row) => row.status === 'attended');
  const durations = attended
    .map((row) => minutesBetween(row.created_at, row.attended_at))
    .filter((value) => value !== null);
  summary.addRows([
    ['Informe de solicitudes GESTION Y ATENCION DE CLIENTES'],
    ['Generado', new Date()],
    ['Total de solicitudes', rows.filter((row) => row.status !== 'cancelled').length],
    ['Pendientes de atención', rows.filter((row) => row.status === 'pending').length],
    ['Atendidas', attended.length],
    ['Canceladas', rows.filter((row) => row.status === 'cancelled').length],
    ['Espera promedio (minutos)', durations.length
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : 'Sin datos de atenciones todavía'],
  ]);
  summary.getColumn(1).width = 34;
  summary.getColumn(2).width = 32;
  summary.getRow(1).font = { bold: true, size: 16 };

  const requests = workbook.addWorksheet('Solicitudes');
  requests.columns = [
    { header: 'Código', key: 'id', width: 12 },
    { header: 'Fecha de solicitud (UTC)', key: 'created_at', width: 25 },
    { header: 'Categoría', key: 'category', width: 20 },
    { header: 'Teléfono cliente', key: 'customer_phone', width: 20 },
    { header: 'Gestor', key: 'manager_name', width: 20 },
    { header: 'Teléfono gestor', key: 'manager_phone', width: 20 },
    { header: 'Detalle', key: 'details', width: 55 },
    { header: 'Estado', key: 'status', width: 20 },
    { header: 'Atendida (UTC)', key: 'attended_at', width: 25 },
    { header: 'Espera (minutos)', key: 'wait_minutes', width: 20 },
  ];
  requests.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  requests.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF174A6E' } };
  for (const row of rows) {
    requests.addRow({
      ...row,
      wait_minutes: minutesBetween(row.created_at, row.attended_at),
    });
  }
  requests.views = [{ state: 'frozen', ySplit: 1 }];
  requests.autoFilter = 'A1:J1';

  return workbook.xlsx.writeBuffer();
}
