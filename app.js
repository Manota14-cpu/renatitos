(() => {
  'use strict';

  const { CONFIG, TALLES, CATEGORIAS, TIPOS, PRODUCTOS } = window.RENATITOS;

  // ---- Utilidades ----
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const peso = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const slug = (s) => normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (v === true) node.setAttribute(k, '');
      else if (v !== false && v != null) node.setAttribute(k, v);
    }
    for (const c of children) if (c) node.append(c);
    return node;
  }

  function useEl(href, cls) {
    const u = document.createElementNS(SVG_NS, 'use');
    u.setAttribute('href', href);
    if (cls) u.setAttribute('class', cls);
    return u;
  }

  function garment(p) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', `garment tone-${p.tono}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.append(useEl(`#g-${p.prenda}`));
    if (p.estampado) svg.append(useEl(`#g-${p.prenda}`, `pat-${p.estampado}`));
    return svg;
  }

  // Escena tipo "flat lay": yute + prenda, o la foto real si existe
  function scene(p, extraClass = '') {
    const box = el('div', { class: `scene ${extraClass}`.trim() });
    if (p.imagen) {
      box.append(el('img', { class: 'photo', src: p.imagen, alt: '', loading: 'lazy', width: 800, height: 1000 }));
    } else {
      box.append(el('span', { class: 'mat', 'aria-hidden': 'true' }), garment(p));
    }
    return box;
  }

  function card(p) {
    const art = scene(p);
    art.append(el('span', { class: 'tag', text: p.nombre }));
    const meta = el('div', { class: 'card-meta' }, el('span', { text: CATEGORIAS[p.cat] }), el('span', { text: peso.format(p.precio) }));
    const btn = el('button', { class: 'card', type: 'button', 'data-id': p.id, 'aria-label': `${p.nombre}, ${peso.format(p.precio)}. Elegir talle` }, art, meta);
    return el('li', {}, btn);
  }

  const storage = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* modo privado o bloqueado */ }
    },
  };

  const porId = new Map(PRODUCTOS.map((p) => [p.id, p]));
  const tipoDe = (p) => TIPOS[p.prenda] || 'Otros';
  const enCatalogo = !!$('#catalogo');

  // ---- Menú móvil ----
  const menuBtn = $('.menu-btn');
  const menu = $('#menu');
  function closeMenu() {
    menu.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Abrir menú');
  }
  menuBtn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', closeMenu));

  // ---- Toast ----
  const toast = $('#toast');
  let toastTimer;
  function avisar(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  // ---- Bolsa (compartida entre páginas) ----
  let bolsa = storage.get('renatitos-bolsa', []).filter((i) => porId.has(i.id) && Number.isInteger(i.cant) && i.cant > 0);

  const cartDialog = $('#cart-dialog');
  const cartList = $('#cart-list');
  const cartEmpty = $('#cart-empty');
  const cartFoot = $('#cart-foot');
  const cartCount = $('#cart-count');
  const cartWa = $('#cart-wa');

  const totalBolsa = () => bolsa.reduce((s, i) => s + porId.get(i.id).precio * i.cant, 0);
  const entrega = () => (cartDialog.querySelector('input[name="entrega"]:checked')?.value === 'envio'
    ? 'Envío a domicilio'
    : 'Retiro en el local');

  function mensajeWhatsApp() {
    const lineas = bolsa.map((i) => {
      const p = porId.get(i.id);
      return `• ${i.cant} x ${p.nombre} (talle ${i.talle}): ${peso.format(p.precio * i.cant)}`;
    });
    const texto = [
      `¡Hola ${CONFIG.nombre}! Quiero hacer este pedido:`,
      '',
      ...lineas,
      '',
      `Total: ${peso.format(totalBolsa())}`,
      `Entrega: ${entrega()}`,
    ].join('\n');
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
  }

  function cambiarCantidad(idx, delta) {
    const item = bolsa[idx];
    if (!item) return;
    item.cant += delta;
    if (item.cant <= 0) bolsa.splice(idx, 1);
    renderBolsa();
  }

  function renderBolsa() {
    storage.set('renatitos-bolsa', bolsa);
    const unidades = bolsa.reduce((s, i) => s + i.cant, 0);
    cartCount.textContent = String(unidades);
    cartCount.hidden = unidades === 0;
    $('#open-cart').setAttribute('aria-label', `Abrir bolsa, ${plural(unidades, 'prenda', 'prendas')}`);

    cartEmpty.hidden = bolsa.length > 0;
    cartFoot.hidden = bolsa.length === 0;

    cartList.replaceChildren(...bolsa.map((item, idx) => {
      const p = porId.get(item.id);
      const menos = el('button', { type: 'button', 'aria-label': `Quitar una unidad de ${p.nombre}`, text: '−' });
      const mas = el('button', { type: 'button', 'aria-label': `Sumar una unidad de ${p.nombre}`, text: '+' });
      menos.addEventListener('click', () => cambiarCantidad(idx, -1));
      mas.addEventListener('click', () => cambiarCantidad(idx, 1));
      const quitar = el('button', { class: 'link-btn', type: 'button', text: 'Quitar' });
      quitar.addEventListener('click', () => cambiarCantidad(idx, -item.cant));
      const info = el('div', { class: 'cart-info' },
        el('strong', { text: p.nombre }),
        el('span', { class: 'muted', text: `Talle ${item.talle}` }),
        el('span', { text: peso.format(p.precio * item.cant) }),
        el('div', { class: 'cart-row' }, el('div', { class: 'qty' }, menos, el('span', { text: String(item.cant) }), mas), quitar),
      );
      return el('li', {}, scene(p, 'cart-art'), info);
    }));

    if (bolsa.length) {
      $('#cart-total').textContent = peso.format(totalBolsa());
      cartWa.href = mensajeWhatsApp();
    }
  }

  function agregar(id, talle) {
    const existente = bolsa.find((i) => i.id === id && i.talle === talle);
    if (existente) existente.cant += 1;
    else bolsa.push({ id, talle, cant: 1 });
    renderBolsa();
  }

  $('#open-cart').addEventListener('click', () => cartDialog.showModal());
  $$('input[name="entrega"]').forEach((r) => r.addEventListener('change', () => { cartWa.href = mensajeWhatsApp(); }));

  // Si otra pestaña cambia la bolsa, mantenerla al día
  window.addEventListener('storage', (e) => {
    if (e.key !== 'renatitos-bolsa') return;
    bolsa = storage.get('renatitos-bolsa', []).filter((i) => porId.has(i.id));
    renderBolsa();
  });

  // ---- Diálogos: cerrar con botón, clic en el fondo o Esc ----
  $$('dialog').forEach((dlg) => {
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
  });

  // ---- Detalle de producto ----
  const pd = {
    dialog: $('#product-dialog'),
    art: $('#pd-art'),
    cat: $('#pd-cat'),
    title: $('#pd-title'),
    price: $('#pd-price'),
    desc: $('#pd-desc'),
    sizes: $('#pd-sizes'),
    error: $('#pd-error'),
    form: $('#pd-form'),
  };
  let actual = null;

  function abrirProducto(id) {
    const p = porId.get(id);
    if (!p) return;
    actual = p;
    pd.art.replaceChildren(...scene(p).childNodes);
    pd.cat.textContent = `${CATEGORIAS[p.cat]} / ${tipoDe(p)}`;
    pd.title.textContent = p.nombre;
    pd.price.textContent = peso.format(p.precio);
    pd.desc.textContent = p.desc;
    pd.error.textContent = '';
    pd.sizes.replaceChildren(...TALLES[p.talles].map((t) => {
      const input = el('input', { type: 'radio', name: 'talle', value: t });
      input.addEventListener('change', () => { pd.error.textContent = ''; });
      return el('label', { class: 'size' }, input, el('span', { text: t }));
    }));
    if (TALLES[p.talles].length === 1) pd.sizes.querySelector('input').checked = true;
    pd.dialog.showModal();
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.card');
    if (btn) abrirProducto(btn.dataset.id);
  });

  pd.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const sel = pd.form.querySelector('input[name="talle"]:checked');
    if (!sel) {
      pd.error.textContent = 'Elegí un talle para agregarlo a la bolsa.';
      return;
    }
    agregar(actual.id, sel.value);
    pd.dialog.close();
    avisar(`Agregado a la bolsa: ${actual.nombre}, talle ${sel.value}`);
  });

  // ---- Inicio: fila de novedades ----
  const track = $('#track');
  if (track) {
    const nuevos = PRODUCTOS.filter((p) => p.nuevo);
    track.replaceChildren(...(nuevos.length ? nuevos : PRODUCTOS.slice(0, 8)).map(card));
    const paso = () => track.clientWidth * 0.8;
    $('#prev')?.addEventListener('click', () => track.scrollBy({ left: -paso(), behavior: 'smooth' }));
    $('#next')?.addEventListener('click', () => track.scrollBy({ left: paso(), behavior: 'smooth' }));
  }

  // ---- Fuera del catálogo: buscar lleva al catálogo con la búsqueda aplicada ----
  if (!enCatalogo) {
    $('#search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#q').value.trim();
      location.href = q ? `catalogo.html?q=${encodeURIComponent(q)}` : 'catalogo.html';
    });
    // Marcar en el menú la página actual (por ejemplo, Ayuda)
    $$('a', menu).forEach((a) => {
      const u = new URL(a.href, location.href);
      if (!u.search && u.pathname.replace(/\.html$/, '') === location.pathname.replace(/\.html$/, '')) a.setAttribute('aria-current', 'page');
    });
  }

  // ---- Catálogo ----
  if (enCatalogo) {
    const ORDENES = {
      destacados: { label: 'Destacados', fn: null },
      'precio-asc': { label: 'Menor precio', fn: (a, b) => a.precio - b.precio },
      'precio-desc': { label: 'Mayor precio', fn: (a, b) => b.precio - a.precio },
      nombre: { label: 'Nombre (A-Z)', fn: (a, b) => a.nombre.localeCompare(b.nombre, 'es') },
    };
    const tiposPorSlug = new Map(Object.values(TIPOS).map((t) => [slug(t), t]));

    const ui = {
      title: $('#cat-title'),
      count: $('#cat-count'),
      crumb: $('#crumb-current'),
      cats: $('#cat-links'),
      tipos: $('#tipo-list'),
      tiposGroup: $('#tipo-group'),
      orden: $('#orden'),
      grid: $('#grid'),
      empty: $('#cat-empty'),
      status: $('#result-status'),
      q: $('#q'),
    };

    const state = { cat: 'todo', tipos: new Set(), orden: 'destacados', q: '' };

    function leerURL() {
      const params = new URLSearchParams(location.search);
      const cat = params.get('cat');
      state.cat = cat in CATEGORIAS ? cat : 'todo';
      state.tipos = new Set((params.get('tipo') || '').split(',').filter((t) => tiposPorSlug.has(t)));
      const orden = params.get('orden');
      state.orden = orden in ORDENES ? orden : 'destacados';
      state.q = (params.get('q') || '').slice(0, 40);
      ui.q.value = state.q;
      ui.orden.value = state.orden;
    }

    function escribirURL(push) {
      const params = new URLSearchParams();
      if (state.cat !== 'todo') params.set('cat', state.cat);
      if (state.tipos.size) params.set('tipo', [...state.tipos].join(','));
      if (state.orden !== 'destacados') params.set('orden', state.orden);
      if (state.q.trim()) params.set('q', state.q.trim());
      const qs = params.toString();
      const url = `${location.pathname}${qs ? `?${qs}` : ''}`;
      history[push ? 'pushState' : 'replaceState'](null, '', url);
    }

    const coincideBusqueda = (p, q) => !q
      || normalizar(p.nombre).includes(q)
      || normalizar(CATEGORIAS[p.cat]).includes(q)
      || normalizar(tipoDe(p)).includes(q);

    function render() {
      const q = normalizar(state.q.trim());
      const buscados = PRODUCTOS.filter((p) => coincideBusqueda(p, q));
      const enCategoria = buscados.filter((p) => state.cat === 'todo' || p.cat === state.cat);

      // Tipos disponibles en esta categoría (con su cantidad)
      const conteoTipos = new Map();
      for (const p of enCategoria) conteoTipos.set(tipoDe(p), (conteoTipos.get(tipoDe(p)) || 0) + 1);
      for (const t of [...state.tipos]) if (!conteoTipos.has(tiposPorSlug.get(t))) state.tipos.delete(t);

      let lista = state.tipos.size
        ? enCategoria.filter((p) => state.tipos.has(slug(tipoDe(p))))
        : enCategoria;
      const orden = ORDENES[state.orden].fn;
      if (orden) lista = [...lista].sort(orden);

      // Encabezado
      const titulo = state.cat === 'todo' ? 'Toda la colección' : CATEGORIAS[state.cat];
      ui.title.textContent = titulo;
      ui.crumb.textContent = state.cat === 'todo' ? 'Catálogo' : titulo;
      const busqueda = state.q.trim();
      ui.count.textContent = plural(lista.length, 'prenda', 'prendas') + (busqueda ? ` para “${busqueda}”` : '');
      ui.status.textContent = `${titulo}: ${plural(lista.length, 'prenda', 'prendas')}`;
      document.title = `${titulo} — Renatitos`;

      // Categorías con cantidad
      const conteoCat = { todo: buscados.length };
      for (const p of buscados) conteoCat[p.cat] = (conteoCat[p.cat] || 0) + 1;
      $$('a', ui.cats).forEach((a) => {
        const c = a.dataset.cat;
        if (c === state.cat) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
        a.querySelector('.n').textContent = String(conteoCat[c] || 0);
      });
      $$('a', menu).forEach((a) => {
        const u = new URL(a.href, location.href);
        const activo = u.pathname.replace(/\.html$/, '') === location.pathname.replace(/\.html$/, '')
          && (u.searchParams.get('cat') || 'todo') === state.cat;
        if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });

      // Tipos de prenda
      const tipos = [...conteoTipos.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
      ui.tiposGroup.hidden = tipos.length < 2;
      ui.tipos.replaceChildren(...tipos.map(([nombre, n]) => {
        const s = slug(nombre);
        const input = el('input', { type: 'checkbox', value: s });
        input.checked = state.tipos.has(s);
        input.addEventListener('change', () => {
          if (input.checked) state.tipos.add(s); else state.tipos.delete(s);
          escribirURL(false);
          render();
        });
        return el('li', {}, el('label', { class: 'check' }, input, el('span', { text: nombre }), el('span', { class: 'n', text: String(n) })));
      }));

      ui.grid.replaceChildren(...lista.map(card));
      ui.empty.hidden = lista.length > 0;
    }

    // Links que apuntan al catálogo (menú, categorías, vaciar filtros): sin recargar la página
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const url = new URL(a.href, location.href);
      const ruta = (p) => p.replace(/\.html$/, '');
      if (url.origin !== location.origin || ruta(url.pathname) !== ruta(location.pathname) || url.hash) return;
      e.preventDefault();
      history.pushState(null, '', url.pathname + url.search);
      leerURL();
      render();
      if (a.closest('#menu, .footer-grid, .drawer')) window.scrollTo({ top: 0 });
    });

    window.addEventListener('popstate', () => { leerURL(); render(); });

    ui.orden.addEventListener('change', () => {
      state.orden = ui.orden.value;
      escribirURL(false);
      render();
    });

    $('#search-form').addEventListener('submit', (e) => e.preventDefault());
    ui.q.addEventListener('input', () => {
      state.q = ui.q.value;
      escribirURL(false);
      render();
    });

    leerURL();
    render();
  }

  renderBolsa();
})();
