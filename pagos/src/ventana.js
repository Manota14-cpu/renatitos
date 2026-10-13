// productos.js está escrito para el navegador (window.RENATITOS). En el servidor no hay window,
// así que se lo apunta al objeto global antes de importarlo.
globalThis.window ??= globalThis;
