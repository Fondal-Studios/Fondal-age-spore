/* =====================================================================================================
   fondal-plus.js — Pase Fundador (cosméticos) de Fondal Age Spore. window.FondalPlus
   Regla de diseño (docs/MONETIZACION.md): lo pago NUNCA da ventaja jugable. Solo cambia cómo se ve:
   estelas y colores de tus flotas (Era 6), una insignia en la portada y tu nombre en los créditos.
   Nada de esto entra en la simulación: no toca G, ni R(), ni el hash del modo en línea.

   Códigos: FND-XXXX-XXXX-C (C = dígito de control). La comprobación es local y solo detecta errores de tipeo:
   es un sistema de honor pensado para la alfa (los códigos se entregan con la compra en itch.io o Ko-fi).
   Para algo resistente a copias hace falta validar en un servidor: ver docs/MONETIZACION.md §8.

     FondalPlus.active() · activate(código) → {ok, msg} · skins() · skin() → {id, n, trail} | null · setSkin(id) · badgeHTML()
   ===================================================================================================== */
(function (root) {
  'use strict';
  const KEY = 'fondal_plus_v1', ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const SKINS = [
    { id: 'aurora', n: 'Aurora', trail: '#6ff0c8', d: 'Estela verde agua, como una aurora polar.' },
    { id: 'oro', n: 'Corona solar', trail: '#ffd25e', d: 'Estela dorada, del color de un enjambre de Dyson.' },
    { id: 'nebulosa', n: 'Nebulosa', trail: '#d58cff', d: 'Estela violeta de nebulosa.' },
    { id: 'brasa', n: 'Brasa', trail: '#ff7a4a', d: 'Estela naranja de reentrada.' }
  ];
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const write = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  /* dígito de control: suma ponderada de los 8 caracteres (detecta tipeos y cambios de orden, no falsificaciones) */
  function check(body) { let s = 0; for (let i = 0; i < body.length; i++) s += (ALPH.indexOf(body[i]) + 1) * (i + 3) * (i % 2 ? 7 : 3); return ALPH[s % ALPH.length]; }
  function norm(code) { return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function valid(code) { const c = norm(code); if (!/^FND[A-Z0-9]{9}$/.test(c)) return false; const body = c.slice(3, 11); if ([...body].some(ch => ALPH.indexOf(ch) < 0)) return false; return check(body) === c[11]; }
  function make(body) { body = norm(body).slice(0, 8); return 'FND-' + body.slice(0, 4) + '-' + body.slice(4, 8) + '-' + check(body); }
  const api = {
    SKINS,
    active() { const o = read(); return !!(o && o.code && valid(o.code)); },
    activate(code) {
      if (!valid(code)) return { ok: false, msg: 'Ese código no es válido. Revisá que esté completo (FND-XXXX-XXXX-X).' };
      const o = read() || {}; o.code = make(norm(code).slice(3, 11)); o.at = Date.now(); o.skin = o.skin || 'aurora'; write(o);
      return { ok: true, msg: '¡Gracias por apoyar el juego! Pase Fundador activo en este navegador.' };
    },
    deactivate() { try { localStorage.removeItem(KEY); } catch (e) {} },
    skins() { return SKINS.slice(); },
    skin() { if (!api.active()) return null; const o = read(); return SKINS.find(s => s.id === o.skin) || SKINS[0]; },
    setSkin(id) { const o = read(); if (!o || !SKINS.some(s => s.id === id)) return false; o.skin = id; write(o); return true; },
    badgeHTML() { return api.active() ? '<span class="plus" title="Pase Fundador">Fundador</span>' : ''; },
    _make: make, _valid: valid
  };
  root.FondalPlus = api;
})(typeof window !== 'undefined' ? window : globalThis);
