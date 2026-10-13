import './ventana.js';
import '../../productos.js';

// Mismos productos, precios y talles que muestra la página: salen de productos.js.
const { CONFIG, TALLES, PRODUCTOS } = globalThis.RENATITOS;
const porId = new Map(PRODUCTOS.map((p) => [p.id, p]));

export const PROVINCIAS = [
  'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta',
  'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];
export const CONDICIONES_IVA = ['Consumidor final', 'Monotributista', 'Responsable inscripto', 'Exento'];

export class ErrorDePedido extends Error {
  constructor(mensaje, codigo = 'datos') {
    super(mensaje);
    this.codigo = codigo;
  }
}

const peso = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

function texto(valor, nombre, { min = 1, max = 100, opcional = false } = {}) {
  const t = typeof valor === 'string' ? valor.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  if (!t && opcional) return '';
  if (t.length < min || t.length > max) throw new ErrorDePedido(`Revisá el campo «${nombre}».`);
  return t;
}

const digitos = (valor) => (typeof valor === 'string' ? valor.replace(/\D/g, '') : '');

export function cuitValido(cuit) {
  if (!/^\d{11}$/.test(cuit)) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((s, p, i) => s + p * Number(cuit[i]), 0);
  let dv = 11 - (suma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) return false;
  return dv === Number(cuit[10]);
}

// Revisa lo que manda la página y devuelve el pedido con los precios de productos.js.
export function leerPedido(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object') throw new ErrorDePedido('Pedido vacío.');
  const { items, comprador: c } = cuerpo;
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) throw new ErrorDePedido('La bolsa está vacía.');
  if (!c || typeof c !== 'object') throw new ErrorDePedido('Faltan tus datos.');

  const renglones = items.map((i) => {
    const p = porId.get(i?.id);
    if (!p || !TALLES[p.talles].includes(i.talle)) throw new ErrorDePedido('Una de las prendas no se puede pagar con Mercado Pago en este momento.', 'precios');
    if (!Number.isInteger(i.cant) || i.cant < 1 || i.cant > 20) throw new ErrorDePedido('Revisá las cantidades de la bolsa.');
    if (i.precio !== p.precio) throw new ErrorDePedido('Los precios de la bolsa no coinciden con los de la tienda.', 'precios');
    return { id: p.id, nombre: p.nombre, talle: i.talle, cant: i.cant, precio: p.precio };
  });

  const comprador = {
    nombre: texto(c.nombre, 'Nombre y apellido', { min: 3, max: 80 }),
    email: texto(c.email, 'Email', { min: 6, max: 120 }),
    telefono: digitos(c.telefono),
    documento: digitos(c.documento),
    entrega: c.entrega === 'envio' ? 'envio' : 'retiro',
    iva: CONDICIONES_IVA.includes(c.iva) ? c.iva : CONDICIONES_IVA[0],
    nota: texto(c.nota, 'Aclaraciones', { max: 300, opcional: true }),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(comprador.email)) throw new ErrorDePedido('Revisá el email.');
  if (comprador.telefono.length < 8 || comprador.telefono.length > 15) throw new ErrorDePedido('Revisá el celular.');
  if (!(comprador.documento.length >= 7 && comprador.documento.length <= 8) && !cuitValido(comprador.documento)) {
    throw new ErrorDePedido('Revisá el DNI o CUIT.');
  }

  if (comprador.entrega === 'envio') {
    comprador.calle = texto(c.calle, 'Calle y número', { min: 3, max: 100 });
    comprador.piso = texto(c.piso, 'Piso y depto', { max: 40, opcional: true });
    comprador.localidad = texto(c.localidad, 'Localidad', { min: 2, max: 60 });
    comprador.cp = texto(c.cp, 'Código postal', { min: 4, max: 8 }).toUpperCase();
    if (!/^[A-Z]?\d{4}[A-Z]{0,3}$/.test(comprador.cp)) throw new ErrorDePedido('Revisá el código postal.');
    if (!PROVINCIAS.includes(c.provincia)) throw new ErrorDePedido('Elegí la provincia.');
    comprador.provincia = c.provincia;
  }

  if (comprador.iva !== 'Consumidor final') {
    comprador.razon = texto(c.razon, 'Nombre o razón social', { min: 3, max: 120 });
    comprador.cuit = digitos(c.cuit);
    if (!cuitValido(comprador.cuit)) throw new ErrorDePedido('Revisá el CUIT para la factura.');
  }

  const costoEnvio = comprador.entrega === 'envio' && Number.isFinite(CONFIG.costoEnvio) && CONFIG.costoEnvio > 0
    ? CONFIG.costoEnvio
    : 0;
  return { renglones, comprador, costoEnvio };
}

export function codigoDePedido() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const azar = crypto.getRandomValues(new Uint8Array(6));
  return `R-${[...azar].map((n) => letras[n % letras.length]).join('')}`;
}

export function detalle({ renglones, costoEnvio }) {
  const lineas = renglones.map((r) => `${r.cant} x ${r.nombre} (talle ${r.talle}): ${peso.format(r.precio * r.cant)}`);
  if (costoEnvio) lineas.push(`Envío: ${peso.format(costoEnvio)}`);
  return lineas.join('\n');
}

export function direccion(c) {
  if (c.entrega !== 'envio') return 'Retiro en el local';
  return `${c.calle}${c.piso ? `, ${c.piso}` : ''}, ${c.localidad} (CP ${c.cp}), ${c.provincia}`;
}

// Cuerpo para POST /checkout/preferences de Mercado Pago (Checkout Pro).
export function preferencia(pedido, codigo, sitio) {
  const { renglones, comprador: c, costoEnvio } = pedido;
  const items = renglones.map((r) => ({
    id: r.id,
    title: `${r.nombre} (talle ${r.talle})`.slice(0, 250),
    quantity: r.cant,
    currency_id: 'ARS',
    unit_price: r.precio,
  }));
  if (costoEnvio) items.push({ id: 'envio', title: 'Envío a domicilio', quantity: 1, currency_id: 'ARS', unit_price: costoEnvio });

  const vuelta = (estado) => `${sitio}/index.html?pago=${estado}`;
  return {
    items,
    payer: {
      name: c.nombre,
      email: c.email,
      phone: { number: c.telefono },
      identification: { type: c.documento.length === 11 ? 'CUIT' : 'DNI', number: c.documento },
      ...(c.entrega === 'envio' ? { address: { street_name: c.calle, zip_code: c.cp } } : {}),
    },
    external_reference: codigo,
    statement_descriptor: 'RENATITOS',
    back_urls: { success: vuelta('ok'), pending: vuelta('pendiente'), failure: vuelta('error') },
    auto_return: 'approved',
    // Mercado Pago guarda estos datos con el pago; el panel /pedidos los muestra.
    metadata: {
      tienda: 'renatitos-web',
      pedido: codigo,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      documento: c.documento,
      entrega: direccion(c),
      iva: c.iva,
      razon_social: c.razon || '',
      cuit: c.cuit || '',
      nota: c.nota,
      detalle: detalle(pedido),
    },
  };
}
