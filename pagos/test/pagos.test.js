import { test } from 'node:test';
import assert from 'node:assert/strict';
import servidor from '../src/index.js';
import { cuitValido, leerPedido } from '../src/pedido.js';

const SITIO = 'https://manota14-cpu.github.io/renatitos';
const env = { SITIO, MP_ACCESS_TOKEN: 'TEST-token', PANEL_CLAVE: 'clave-larga' };

const comprador = {
  nombre: 'Ana Pérez', email: 'ana@example.com', telefono: '3492 15-123456', documento: '30.123.456',
  entrega: 'envio', calle: 'Bv. Roca 1678', piso: '', localidad: 'Rafaela', cp: '2300', provincia: 'Santa Fe',
  iva: 'Consumidor final', nota: '',
};
const items = [{ id: 'p01', talle: '4', cant: 2, precio: 38900 }];

function pedir(cuerpo, origen = 'https://manota14-cpu.github.io') {
  return new Request('https://renatitos-pagos.example/preferencia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origen },
    body: JSON.stringify(cuerpo),
  });
}

function conMercadoPago(respuesta, fn) {
  const original = globalThis.fetch;
  const llamadas = [];
  globalThis.fetch = async (url, init) => {
    llamadas.push({ url: String(url), init });
    return new Response(JSON.stringify(respuesta), { status: 200 });
  };
  return fn(llamadas).finally(() => { globalThis.fetch = original; });
}

test('CUIT: valida el dígito verificador', () => {
  assert.equal(cuitValido('20111111112'), true);
  assert.equal(cuitValido('20111111113'), false);
  assert.equal(cuitValido('2011111111'), false);
});

test('arma la preferencia con los precios de productos.js y vuelve a la carpeta de la página', () =>
  conMercadoPago({ init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1' }, async (llamadas) => {
    const r = await servidor.fetch(pedir({ items, comprador, sitio: `${SITIO}/` }), env);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://manota14-cpu.github.io');
    const datos = await r.json();
    assert.match(datos.pedido, /^R-[A-Z2-9]{6}$/);
    assert.match(datos.url, /mercadopago/);

    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].url, 'https://api.mercadopago.com/checkout/preferences');
    assert.equal(llamadas[0].init.headers.Authorization, 'Bearer TEST-token');
    const pref = JSON.parse(llamadas[0].init.body);
    assert.deepEqual(pref.items, [{ id: 'p01', title: 'Jardinero de jean (talle 4)', quantity: 2, currency_id: 'ARS', unit_price: 38900 }]);
    assert.equal(pref.back_urls.success, `${SITIO}/index.html?pago=ok`);
    assert.equal(pref.external_reference, datos.pedido);
    assert.equal(pref.payer.identification.number, '30123456');
    assert.equal(pref.metadata.entrega, 'Bv. Roca 1678, Rafaela (CP 2300), Santa Fe');
    assert.equal(pref.metadata.telefono, '349215123456');
  }));

test('rechaza un precio distinto al publicado', () =>
  conMercadoPago({}, async (llamadas) => {
    const r = await servidor.fetch(pedir({ items: [{ ...items[0], precio: 100 }], comprador }), env);
    assert.equal(r.status, 400);
    assert.equal((await r.json()).codigo, 'precios');
    assert.equal(llamadas.length, 0);
  }));

test('rechaza otro origen', async () => {
  const r = await servidor.fetch(pedir({ items, comprador }, 'https://otro.example'), env);
  assert.equal(r.status, 403);
});

test('pide dirección para envío y CUIT válido para factura', () => {
  assert.throws(() => leerPedido({ items, comprador: { ...comprador, calle: '' } }), /Calle/);
  assert.throws(() => leerPedido({ items, comprador: { ...comprador, iva: 'Responsable inscripto', razon: 'Ana SA', cuit: '20111111113' } }), /CUIT/);
  const ok = leerPedido({ items, comprador: { ...comprador, entrega: 'retiro', calle: '', iva: 'Monotributista', razon: 'Ana Pérez', cuit: '20-11111111-2' } });
  assert.equal(ok.comprador.cuit, '20111111112');
  assert.equal(ok.comprador.calle, undefined);
});

test('el panel pide clave y muestra solo los pagos de la página', () =>
  conMercadoPago({
    results: [
      { id: 1, status: 'approved', transaction_amount: 77800, date_created: '2026-10-13T15:00:00.000-03:00',
        metadata: { tienda: 'renatitos-web', pedido: 'R-ABCDEF', nombre: 'Ana <b>', documento: '30123456', telefono: '1', email: 'a@b.c', entrega: 'Retiro en el local', iva: 'Consumidor final', detalle: '2 x Jardinero' } },
      { id: 2, status: 'approved', transaction_amount: 500, date_created: '2026-10-13T15:00:00.000-03:00', metadata: {} },
    ],
  }, async () => {
    const sin = await servidor.fetch(new Request('https://x/pedidos'), env);
    assert.equal(sin.status, 401);
    const mal = await servidor.fetch(new Request('https://x/pedidos', { headers: { Authorization: `Basic ${btoa('a:otra')}` } }), env);
    assert.equal(mal.status, 401);
    const r = await servidor.fetch(new Request('https://x/pedidos', { headers: { Authorization: `Basic ${btoa('renatitos:clave-larga')}` } }), env);
    assert.equal(r.status, 200);
    const pagina = await r.text();
    assert.match(pagina, /R-ABCDEF/);
    assert.match(pagina, /Ana &lt;b&gt;/);
    assert.doesNotMatch(pagina, /\$\s?500\b/);
  }));
