import { leerPedido, preferencia, codigoDePedido, ErrorDePedido } from './pedido.js';

const API = 'https://api.mercadopago.com';

// Secretos (wrangler secret put): MP_ACCESS_TOKEN y PANEL_CLAVE. Variable: SITIO (wrangler.toml).
export default {
  async fetch(pedido, env) {
    const { pathname } = new URL(pedido.url);
    try {
      if (pathname === '/preferencia') return await rutaPreferencia(pedido, env);
      if (pathname === '/pedidos' && pedido.method === 'GET') return await rutaPedidos(pedido, env);
      if (pathname === '/' && pedido.method === 'GET') return new Response('Pagos de Renatitos', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      return new Response('No encontrado', { status: 404 });
    } catch (error) {
      console.error(error);
      return new Response('Error del servidor', { status: 500 });
    }
  },
};

// Solo la página de Renatitos puede pedir cobros. SITIO es la dirección de la página (con su carpeta,
// si tiene) y admite varias separadas por coma. Devuelve el origen para CORS y la dirección para volver.
function sitioPermitido(pedido, env, pedida) {
  const origen = pedido.headers.get('Origin');
  if (!origen) return null;
  const limpiar = (s) => String(s || '').trim().replace(/\/+$/, '');
  const sitios = String(env.SITIO || '').split(',').map(limpiar).filter(Boolean);
  const candidatos = sitios.filter((s) => {
    try { return new URL(s).origin === origen; } catch { return false; }
  });
  if (!candidatos.length) return null;
  const sitio = candidatos.find((s) => s === limpiar(pedida)) || candidatos[0];
  return { origen, sitio };
}

function json(datos, estado, origen) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(origen ? { 'Access-Control-Allow-Origin': origen, Vary: 'Origin' } : {}),
    },
  });
}

async function rutaPreferencia(pedido, env) {
  const permitido = sitioPermitido(pedido, env);
  const origen = permitido?.origen ?? null;
  if (pedido.method === 'OPTIONS') {
    return new Response(null, {
      status: origen ? 204 : 403,
      headers: origen
        ? {
            'Access-Control-Allow-Origin': origen,
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
            Vary: 'Origin',
          }
        : {},
    });
  }
  if (pedido.method !== 'POST') return json({ error: 'Método no permitido.' }, 405, origen);
  if (!origen) return json({ error: 'Origen no permitido.' }, 403, null);
  if (!env.MP_ACCESS_TOKEN) return json({ error: 'Mercado Pago todavía no está configurado.' }, 503, origen);

  const texto = await pedido.text();
  if (texto.length > 20000) return json({ error: 'Pedido demasiado grande.' }, 413, origen);
  let cuerpo;
  let datos;
  try {
    cuerpo = JSON.parse(texto);
    datos = leerPedido(cuerpo);
  } catch (error) {
    if (error instanceof ErrorDePedido) return json({ error: error.message, codigo: error.codigo }, 400, origen);
    return json({ error: 'Pedido inválido.' }, 400, origen);
  }

  const codigo = codigoDePedido();
  const respuesta = await fetch(`${API}/checkout/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, 'X-Idempotency-Key': codigo },
    body: JSON.stringify(preferencia(datos, codigo, sitioPermitido(pedido, env, cuerpo.sitio).sitio)),
  });
  const mp = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || typeof mp.init_point !== 'string') {
    console.error('Mercado Pago rechazó la preferencia', respuesta.status, JSON.stringify(mp).slice(0, 500));
    return json({ error: 'Mercado Pago no pudo armar el cobro. Probá de nuevo o seguí por WhatsApp.' }, 502, origen);
  }
  return json({ url: mp.init_point, pedido: codigo }, 200, origen);
}

// ---- Panel de pedidos: los últimos pagos hechos desde la página, con los datos de envío y factura ----

async function iguales(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const ax = new Uint8Array(x);
  const ay = new Uint8Array(y);
  let dif = 0;
  for (let i = 0; i < ax.length; i++) dif |= ax[i] ^ ay[i];
  return dif === 0;
}

async function autorizado(pedido, env) {
  const cabecera = pedido.headers.get('Authorization') || '';
  if (!cabecera.startsWith('Basic ')) return false;
  let clave = '';
  try {
    clave = atob(cabecera.slice(6)).split(':').slice(1).join(':');
  } catch {
    return false;
  }
  return iguales(clave, env.PANEL_CLAVE);
}

const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ESTADOS = {
  approved: 'Pagado', pending: 'Pendiente', in_process: 'En revisión', authorized: 'Autorizado',
  rejected: 'Rechazado', cancelled: 'Cancelado', refunded: 'Devuelto', charged_back: 'Contracargo',
};

function html(cuerpo, estado = 200, extra = {}) {
  return new Response(cuerpo, {
    status: estado,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Robots-Tag': 'noindex',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}

const pagina = (contenido) => `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pedidos web — Renatitos</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#fcf9f4;color:#47413d}
main{max-width:860px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:26px;margin:0 0 4px}
.sub{color:#6e655f;margin:0 0 24px}
article{background:#fff;border:1px solid #e9e1d8;border-radius:14px;padding:16px 18px;margin-bottom:14px}
header{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;align-items:baseline}
h2{font-size:18px;margin:0}
.estado{font-weight:600;padding:2px 10px;border-radius:999px;background:#ebece5}
.estado.approved{background:#dcefd9}.estado.rejected,.estado.cancelled{background:#f7e0de}
dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;margin:12px 0 0}
dt{color:#6e655f}dd{margin:0;white-space:pre-line;overflow-wrap:anywhere}
</style></head><body><main>${contenido}</main></body></html>`;

async function rutaPedidos(pedido, env) {
  if (!env.PANEL_CLAVE || !env.MP_ACCESS_TOKEN) return html(pagina('<h1>Panel desactivado</h1><p class="sub">Faltan cargar las claves del servidor.</p>'), 503);
  if (!(await autorizado(pedido, env))) {
    return html(pagina('<h1>Hace falta la clave</h1>'), 401, { 'WWW-Authenticate': 'Basic realm="Pedidos Renatitos", charset="UTF-8"' });
  }

  const url = new URL(`${API}/v1/payments/search`);
  url.searchParams.set('sort', 'date_created');
  url.searchParams.set('criteria', 'desc');
  url.searchParams.set('limit', '100');
  const respuesta = await fetch(url, { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !Array.isArray(datos.results)) {
    return html(pagina('<h1>No se pudo leer Mercado Pago</h1><p class="sub">Probá de nuevo en un rato.</p>'), 502);
  }

  const pagos = datos.results.filter((p) => p?.metadata?.tienda === 'renatitos-web');
  const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' });
  const peso = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  const fichas = pagos.map((p) => {
    const m = p.metadata;
    const filas = [
      ['Productos', m.detalle],
      ['Entrega', m.entrega],
      ['Comprador', `${m.nombre}\nDNI/CUIT ${m.documento}`],
      ['Contacto', `${m.telefono} · ${m.email}`],
      ['Factura', m.iva === 'Consumidor final' ? 'Consumidor final' : `${m.iva}: ${m.razon_social}, CUIT ${m.cuit}`],
      ['Aclaraciones', m.nota],
      ['Operación MP', p.id],
    ].filter(([, v]) => v);
    return `<article><header><h2>${escapar(m.pedido)} · ${escapar(peso.format(p.transaction_amount || 0))}</h2>
<span class="estado ${escapar(p.status)}">${escapar(ESTADOS[p.status] || p.status)}</span></header>
<p class="sub" style="margin:2px 0 0">${escapar(fecha.format(new Date(p.date_created)))}</p>
<dl>${filas.map(([k, v]) => `<dt>${escapar(k)}</dt><dd>${escapar(v)}</dd>`).join('')}</dl></article>`;
  });

  return html(pagina(`<h1>Pedidos web</h1><p class="sub">Pagos con Mercado Pago hechos desde la página. Los pedidos por WhatsApp llegan al chat.</p>
${fichas.join('') || '<p>Todavía no hay pagos desde la página.</p>'}`));
}
