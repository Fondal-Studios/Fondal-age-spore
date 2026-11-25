// Genera códigos del Pase Fundador (FND-XXXX-XXXX-C) para cargarlos como «claves externas» en la tienda (itch.io, Ko-fi…).
// Uso: node tools/codigos-fundador.js 100 > codigos.csv     (NO subir los códigos al repositorio)
// Ojo: el dígito de control solo evita tipeos; quien lea eras/fondal-plus.js puede fabricar códigos. Es un sistema de honor para la alfa.
const crypto = require('crypto');
global.window = global; require('../eras/fondal-plus.js');
const n = Math.max(1, Math.min(10000, +process.argv[2] || 10)), A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', seen = new Set();
while (seen.size < n) { const b = Array.from(crypto.randomBytes(8), x => A[x % A.length]).join(''); seen.add(window.FondalPlus._make(b)); }
console.log([...seen].join('\n'));
