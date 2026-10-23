# Chatbot de WhatsApp para GESTION Y ATENCION DE CLIENTES

Bot inicial conectado a WhatsApp Cloud API. Presenta un menú, recopila el detalle de la solicitud, entrega un enlace directo al gestor y genera un informe Excel descargable.

## Flujo configurado

- Solicitar un vehículo → Diego (`+57 312 272 4152`).
- Hacer un nuevo pedido → Nayide (`+57 310 214 6053`).
- Consultar Última Milla → coordinador (`+57 312 270 1373`, según el número compartido).
- Comunicarse con el coordinador → coordinador (`+57 312 270 1373`).
- Al solicitar un vehículo, el bot muestra de inmediato un enlace `wa.me` directo a Diego, con un mensaje preparado; el cliente debe abrirlo y tocar Enviar para iniciar el chat.
- Para nuevos pedidos, seguimiento y coordinación, el cliente proporciona los detalles al bot y recibe un enlace `wa.me` con el código de solicitud.
- Después de atender al cliente, el gestor escribe `ATENDIDO <código>` al número del bot. Se registra la hora y se calcula la espera.
- `MENU` vuelve al menú y `CANCELAR` cancela la solicitud que estaba completando.

## Requisitos para activarlo

Se necesita Node.js 20 o posterior y una cuenta de Meta Business con WhatsApp Cloud API. La app de WhatsApp Business por sí sola no ejecuta bots. Antes de registrar el número en Cloud API, verifica en Meta si puede conservarse mediante coexistencia o si hace falta migrarlo; no desconectes el número de la app sin revisar ese proceso.

1. Instala dependencias: `npm install`.
2. Copia `.env.example` a `.env` y completa las credenciales que entrega Meta: token de acceso, ID del número de teléfono, token de verificación y secreto de la app. Define también un `ADMIN_REPORT_TOKEN` largo y privado.
3. Revisa los teléfonos de los gestores en `.env`. Deben incluir el código de país y contener solo dígitos.
4. Ejecuta `npm test` y luego `npm start`.
5. Publica el servidor en una URL HTTPS y configura esa URL terminada en `/webhook` como webhook de WhatsApp en Meta. Usa el mismo `META_VERIFY_TOKEN` en el servidor y en el panel de Meta, y suscríbete al evento `messages`.
6. Descarga el Excel con una petición `GET /admin/report.xlsx` y el encabezado `Authorization: Bearer <ADMIN_REPORT_TOKEN>`.

## Despliegue en Render

El archivo `render.yaml` configura un servicio web Node, una comprobación de salud y un disco persistente para los registros. Render puede mostrar cargos por el servicio y el disco; revisa el precio en el panel y no confirmes la creación hasta aceptarlo.

1. Sube este proyecto a un repositorio privado de GitHub. No subas el archivo `.env`, tokens, contraseñas ni códigos de verificación.
2. En Render, crea un Blueprint desde ese repositorio y revisa el plan y el disco que aparecen antes de aplicar cambios.
3. En Environment del servicio, completa `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN` y `META_APP_SECRET`. No los pegues en GitHub ni en chats.
4. Después del despliegue, usa `https://<dominio-del-servicio>/webhook` como URL del webhook en Meta y `META_VERIFY_TOKEN` como token de verificación.
5. Comprueba `https://<dominio-del-servicio>/healthz`; debe responder `{"status":"ok"}`.

Para probar localmente, el webhook debe ser accesible desde Meta mediante HTTPS. El endpoint de informe devuelve todas las solicitudes registradas; protege el token y el archivo porque incluyen números y detalles aportados por clientes.

## Consideraciones

- El informe de GESTION Y ATENCION DE CLIENTES es un archivo `.xlsx` descargable, no se envía automáticamente por WhatsApp. Para programar envíos hace falta definir destinatario y frecuencia.
- El tiempo se mide desde la solicitud recibida por el bot hasta que el gestor registra `ATENDIDO <código>`. Depende de que el gestor envíe esa confirmación después de responder al cliente.
- El código guarda solicitudes localmente en `data/allmar.json` con reemplazo atómico del archivo. En producción, usa almacenamiento persistente y respaldos; evita ejecutar varias instancias del bot sobre el mismo archivo.
- Este proyecto no incluye credenciales de Meta ni activa el número por sí mismo; deben configurarse en el panel oficial antes de recibir mensajes.
