# Gestión y Atención de Clientes

Sitio estático con un asistente virtual interactivo. El visitante puede escribir consultas, usar respuestas rápidas, solicitar un vehículo o pedido, consultar un envío y pedir atención del coordinador.

La identidad visual usa la paleta azul de SI3, las fuentes Plus Jakarta Sans e Inter, y el logo local `logo-si3.png`, obtenido del sitio de referencia: https://www-xaenz.github.io/SI-3/.

## Cómo funciona

- El asistente responde saludos, agradecimientos y despedidas, explica qué puede hacer y reconoce las cuatro opciones de servicio y frases relacionadas en español.
- Pregunta los datos necesarios para entender la solicitud.
- Al terminar, prepara un mensaje y muestra un enlace para continuar por WhatsApp con Diego, Nayide o el coordinador.
- La persona revisa y envía el mensaje desde WhatsApp; la página no manda mensajes por sí sola.
- Al pulsar el enlace, muestra una cuenta regresiva de cinco segundos antes de abrir WhatsApp. Si el navegador bloquea la ventana emergente, abre WhatsApp en la pestaña actual al terminar la espera.
- `menú` vuelve al inicio y `cancelar` detiene la solicitud actual.
- Las respuestas aparecen con una breve pausa y un indicador animado de escritura. La animación respeta la preferencia del sistema para reducir movimiento.
- Al terminar la atención, el equipo puede compartir manualmente el enlace público `https://<usuario>.github.io/<repositorio>/reviews.html`. La página recibe una calificación y un comentario opcional anónimo y ofrece volver al chatbot. El sitio no puede detectar el fin de una conversación externa de WhatsApp ni enviar seguimientos automáticos.
- El informe central guarda en Supabase solo el identificador aleatorio de sesión, fechas y tiempos anónimos; no guarda los mensajes, nombres ni números de contacto. Se abre pulsando cinco veces el logo y requiere autenticación de un usuario administrador de Supabase. También muestra las reseñas y permite descargar las visitas en CSV.

Es un asistente guiado que corre en el navegador, no una IA generativa: no puede responder preguntas arbitrarias ni consultar internet o información en tiempo real. En vez de inventar datos comerciales no configurados (como tarifas, horarios o estados de envío), orienta al visitante y ofrece conectarlo con el coordinador. Para responder cualquier tema con IA generativa se necesitaría integrar un servicio de IA mediante un servidor y una clave privada; no se debe incluir una clave secreta en esta página pública. El saludo usa la hora de Colombia (buenos días de 5:00 a 11:59, buenas tardes de 12:00 a 18:59 y buenas noches durante el resto del día).

## Configurar Supabase

1. En el proyecto existente de Supabase, abre **SQL Editor**, ejecuta el contenido de [`supabase-schema.sql`](./supabase-schema.sql) y confirma que se crearon las tablas `chat_analytics` y `reviews` con RLS habilitado.
2. En **Authentication → Users**, crea una cuenta de correo/contraseña para cada persona autorizada a ver el informe. Desactiva el registro público de usuarios.
3. En **SQL Editor**, agrega esos usuarios a la lista privada de administradores. Repite con cada ID/correo autorizado:

   ```sql
   insert into public.report_admins (user_id)
   select id from auth.users where email = 'admin@tu-dominio.com'
   on conflict do nothing;
   ```

4. En **Project Settings → API**, copia el Project URL y la clave pública `anon`/publishable en [`supabase-config.js`](./supabase-config.js). Esta página pública nunca debe contener una clave `service_role` ni otra clave secreta.
5. Publica el sitio por HTTPS y prueba una visita, el inicio de sesión del informe y el envío de una reseña. El informe se abre con cinco clics al logo, pero la seguridad depende de la autenticación y de las políticas RLS; los cinco clics solo ocultan el acceso.
6. Comparte con el equipo el enlace publicado terminado en `/reviews.html` para que lo envíen manualmente por WhatsApp al finalizar la atención.

La tabla de métricas permite inserciones anónimas con columnas limitadas; solo usuarios autenticados incluidos en `report_admins` pueden consultar métricas y reseñas. Las reseñas son anónimas y no se muestran públicamente. Como el cliente puede enviar un comentario libre, se le pide explícitamente que no incluya datos personales ni información del pedido.

## Probar localmente

Abre `index.html` en un navegador y conversa con el asistente. Para ejecutar las pruebas de lógica y estructura, usa `npm test`. Para probar los módulos ES, la autenticación y el acceso a Supabase, sirve el sitio por HTTP/HTTPS; abrir directamente un archivo `file://` no es adecuado.

## Publicar gratis con GitHub Pages

1. Sube el proyecto a un repositorio de GitHub.
2. En el repositorio, abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**, elige la rama principal y la carpeta `/(root)`, y guarda.
4. Abre la dirección que GitHub Pages muestre. Prueba los enlaces desde un teléfono que tenga WhatsApp.

Los enlaces usan los números de contacto compartidos para el proyecto. Confirma que estén correctos antes de publicar.
