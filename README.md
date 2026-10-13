# Renatitos — Moda infantil

Sitio web de [Renatitos](https://www.instagram.com/renatitoos/), tienda de ropa para bebés, nenas y nenes en Rafaela, Santa Fe.

Sitio estático (HTML, CSS y JavaScript, sin herramientas de armado). Al finalizar la compra, el cliente completa sus datos de envío y factura y elige pagar con Mercado Pago o seguir por WhatsApp. El cobro con Mercado Pago lo arma un servidor chico en `pagos/` (ver [pagos/README.md](pagos/README.md)).

## Páginas

- `index.html`: inicio.
- `catalogo.html`: catálogo con filtros, orden y buscador. Los filtros quedan en la URL (por ejemplo `catalogo.html?cat=nenas&tipo=shorts`).
- `ayuda.html`: cómo comprar, envíos, cambios, botón de arrepentimiento, garantía, términos y privacidad.

## Cómo editar

- **Productos, precios, talles, WhatsApp y costo de envío:** `productos.js`. Si cambian precios o productos, el servidor de pagos se vuelve a publicar (ver `pagos/README.md`). Para usar una foto real en un producto, agregar `imagen: 'img/productos/archivo.webp'` (formato vertical 4:5).
- **Imágenes grandes del inicio:** en `index.html`, reemplazar cada `<div class="banner-art">` por `<img class="banner-photo" src="img/..." alt="" width="1200" height="1500">`.
- **Textos legales:** `ayuda.html`. Lo marcado con `COMPLETAR` tiene que definirlo el local antes de publicar.
- El header, el footer y la bolsa (con el formulario para finalizar la compra) están repetidos en las tres páginas: un cambio ahí se hace en los tres archivos.
- **Tipografías:** Figtree y Quicksand están en `fonts/` (solo alfabeto latino y los pesos que se usan), así la página no depende de Google Fonts para mostrarse.
- Después de cambiar `styles.css`, `app.js` o `productos.js`, subir el número de `?v=` en los tres HTML para que los navegadores no muestren la versión vieja.

Diseño y desarrollo por [Visual Solution](https://visual-solution.vercel.app).
