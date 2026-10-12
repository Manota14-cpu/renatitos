// Datos de la tienda. Este es el único archivo que hay que tocar para cambiar productos, precios o talles.
window.RENATITOS = Object.freeze({
  CONFIG: {
    nombre: 'Renatitos',
    whatsapp: '5493492576899', // 54 9 + característica sin 0 + número
  },

  // Talles de ejemplo: ajustar a los que trabaja el local.
  TALLES: {
    bebes: ['0-3m', '3-6m', '6-9m', '9-12m', '12-18m'],
    kids: ['2', '4', '6', '8', '10', '12'],
    unico: ['Único'],
  },

  CATEGORIAS: { bebes: 'Bebés', nenas: 'Nenas', nenes: 'Nenes', accesorios: 'Accesorios' },

  // Tipo de prenda que se muestra en los filtros, según el dibujo de cada producto.
  TIPOS: {
    tee: 'Remeras y bodys',
    shorts: 'Shorts',
    pants: 'Pantalones',
    jacket: 'Camperas y buzos',
    hoodie: 'Camperas y buzos',
    cardigan: 'Camperas y buzos',
    overall: 'Jardineros y enteritos',
    dress: 'Vestidos',
    cap: 'Gorras y pilusos',
    bucket: 'Gorras y pilusos',
  },

  // Prendas inspiradas en las publicaciones de @renatitoos. Precios de ejemplo.
  // nuevo: true → aparece en "Lo nuevo en el local" de la página de inicio.
  // Para usar una foto real, agregar  imagen: 'img/productos/archivo.webp'  (formato 4:5).
  // prenda: tee | shorts | pants | jacket | hoodie | cardigan | overall | dress | cap | bucket
  // tono: denim | rose | caramel | sand | sage | butter | charcoal | cream
  // estampado (opcional): check | stripe | dot
  PRODUCTOS: [
    { id: 'p01', nombre: 'Jardinero de jean', cat: 'nenes', precio: 38900, prenda: 'overall', tono: 'denim', talles: 'kids', nuevo: true, desc: 'Jardinero de jean flexible, con tiradores regulables y bolsillo en el pecho.' },
    { id: 'p02', nombre: 'Short cuadrillé', cat: 'nenes', precio: 21900, prenda: 'shorts', tono: 'sand', estampado: 'check', talles: 'kids', nuevo: true, desc: 'Short de algodón con cintura elástica y cordón. Combina con todo.' },
    { id: 'p07', nombre: 'Campera de jean', cat: 'nenas', precio: 45900, prenda: 'jacket', tono: 'denim', talles: 'kids', nuevo: true, desc: 'Campera de jean clásica con botones metálicos y bolsillos en el pecho.' },
    { id: 'p11', nombre: 'Cardigan tejido', cat: 'bebes', precio: 32900, prenda: 'cardigan', tono: 'rose', talles: 'bebes', nuevo: true, desc: 'Cardigan de hilo suave con botones de madera.' },
    { id: 'p08', nombre: 'Short a rayas', cat: 'nenas', precio: 19900, prenda: 'shorts', tono: 'butter', estampado: 'stripe', talles: 'kids', nuevo: true, desc: 'Short de algodón a rayas con cintura elástica.' },
    { id: 'p14', nombre: 'Piluso de gabardina', cat: 'accesorios', precio: 14900, prenda: 'bucket', tono: 'sand', talles: 'unico', nuevo: true, desc: 'Piluso con ruedo desflecado, ideal para la playa y la plaza.' },
    { id: 'p10', nombre: 'Short de lunares', cat: 'nenas', precio: 21900, prenda: 'shorts', tono: 'cream', estampado: 'dot', talles: 'kids', nuevo: true, desc: 'Short de jean blanco con lunares y ruedo desflecado.' },
    { id: 'p05', nombre: 'Conjunto deportivo', cat: 'nenes', precio: 42900, prenda: 'hoodie', tono: 'sage', talles: 'kids', nuevo: true, desc: 'Buzo con capucha y bolsillo canguro. Se vende con jogger al tono.' },
    { id: 'p03', nombre: 'Remera Sommer', cat: 'nenes', precio: 16900, prenda: 'tee', tono: 'caramel', talles: 'kids', desc: 'Remera de algodón peinado con estampa frontal.' },
    { id: 'p04', nombre: 'Pantalón de lino', cat: 'nenes', precio: 27900, prenda: 'pants', tono: 'sand', talles: 'kids', desc: 'Pantalón liviano de lino con cintura elástica, fresco para el calor.' },
    { id: 'p06', nombre: 'Remera More amor', cat: 'nenes', precio: 16900, prenda: 'tee', tono: 'cream', talles: 'kids', desc: 'Remera de algodón color crudo con frase estampada.' },
    { id: 'p09', nombre: 'Campera negra con tachas', cat: 'nenas', precio: 47900, prenda: 'jacket', tono: 'charcoal', talles: 'kids', desc: 'Campera de gabardina negra con detalles de tachas.' },
    { id: 'p12', nombre: 'Enterito de algodón', cat: 'bebes', precio: 26900, prenda: 'overall', tono: 'sage', talles: 'bebes', desc: 'Enterito con broches para cambiar el pañal sin desvestir.' },
    { id: 'p13', nombre: 'Body manga corta', cat: 'bebes', precio: 13900, prenda: 'tee', tono: 'rose', talles: 'bebes', desc: 'Body de algodón con cuello americano, fácil de poner.' },
    { id: 'p15', nombre: 'Gorra Chill', cat: 'accesorios', precio: 15900, prenda: 'cap', tono: 'charcoal', talles: 'unico', desc: 'Gorra de gabardina lavada con bordado y cierre regulable.' },
  ],
});
