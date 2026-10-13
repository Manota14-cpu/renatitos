# Servidor de pagos de Renatitos

Arma el cobro con Mercado Pago (Checkout Pro) cuando alguien elige «Pagar con Mercado Pago» al
finalizar la compra. Corre en Cloudflare Workers, dentro del plan gratis.

- `POST /preferencia`: recibe la bolsa y los datos del formulario, revisa los precios contra
  `productos.js` y devuelve el link de pago de Mercado Pago. Solo acepta pedidos de la página
  (variable `SITIO` en `wrangler.toml`).
- `GET /pedidos`: panel con clave para ver los pagos hechos desde la página, con los datos de envío
  y de factura de cada uno.

La clave de Mercado Pago queda guardada en Cloudflare y nunca llega a la página.

## Ponerlo en marcha (una sola vez)

1. **Clave de Mercado Pago de Renatitos.** Con la cuenta de Mercado Pago **de Renatitos** (la que
   recibe la plata), entrar a <https://www.mercadopago.com.ar/developers/panel/app>, crear una
   aplicación de tipo «Pagos online» con Checkout Pro y copiar el **Access Token** de las
   **credenciales de producción** (empieza con `APP_USR-`). No pegarlo en ningún archivo ni chat.

2. **Publicar el servidor** (en Windows, `npx.cmd` en vez de `npx`):

   ```bash
   cd renatitos/pagos
   npm install
   npx wrangler login          # solo si lo pide
   npx wrangler deploy
   npx wrangler secret put MP_ACCESS_TOKEN   # pegar el Access Token
   npx wrangler secret put PANEL_CLAVE       # inventar una clave larga para el panel de pedidos
   ```

   `deploy` muestra la dirección del servidor. Si no es
   `https://renatitos-pagos.visual-app-licencias.workers.dev`, cambiarla en `productos.js`
   (`CONFIG.pagos`) y en el `connect-src` de la primera línea de seguridad de los tres HTML.

3. **Probar** con una compra chica real y devolverla desde Mercado Pago. Tiene que aparecer en
   `https://renatitos-pagos.visual-app-licencias.workers.dev/pedidos` (usuario: cualquiera; clave:
   la de `PANEL_CLAVE`).

## Cuando cambian los precios o los productos

El servidor cobra los precios de `productos.js` tal como estaban la última vez que se publicó. Si se
cambia ese archivo, hay que volver a publicar (`npx wrangler deploy` en esta carpeta). Mientras no
se publique, quien quiera pagar con Mercado Pago ve un aviso y puede seguir por WhatsApp.

Para que se publique solo con cada cambio en `main`, cargar en GitHub (Settings → Secrets and
variables → Actions) los secretos `CLOUDFLARE_API_TOKEN` (un token de Cloudflare creado con la
plantilla «Edit Cloudflare Workers») y `CLOUDFLARE_ACCOUNT_ID`. El workflow
`.github/workflows/pagos.yml` hace el resto.

## Pruebas

```bash
npm test
```
