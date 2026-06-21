/**
 * datos.js — Tablas internas, estado global, conversión de unidades
 * Calculadora Hidráulica de Sistemas de Bombeo
 */

"use strict";

// ═══════════════════════════════════════════════════════════════
// TABLAS POR DEFECTO
// ═══════════════════════════════════════════════════════════════

const FLUIDOS_DEFAULT = [
  { nombre: "Agua 20°C",                  conc: 0.0,  temp: 20, dens: 0.9982, visc: 1.002 },
  { nombre: "NaOH 10%",                   conc: 10.0, temp: 20, dens: 1.109,  visc: 1.30  },
  { nombre: "NaOH 25%",                   conc: 25.0, temp: 20, dens: 1.274,  visc: 2.45  },
  { nombre: "NaOH 50%",                   conc: 50.0, temp: 20, dens: 1.515,  visc: 15.8  },
  { nombre: "H₂SO₄ 10%",                  conc: 10.0, temp: 20, dens: 1.066,  visc: 1.15  },
  { nombre: "H₂SO₄ 25%",                  conc: 25.0, temp: 20, dens: 1.178,  visc: 1.48  },
  { nombre: "H₂SO₄ 50%",                  conc: 50.0, temp: 20, dens: 1.395,  visc: 4.32  },
  { nombre: "Ácido sulfúrico concentrado", conc: 98.0, temp: 20, dens: 1.834,  visc: 26.7  },
  { nombre: "Soda cáustica concentrada",   conc: 50.0, temp: 20, dens: 1.515,  visc: 15.8  },
  { nombre: "Floculante Al 0.1%",          conc: 0.1,  temp: 20, dens: 1.001,  visc: 1.10  },
  { nombre: "Floculante Al 0.5%",          conc: 0.5,  temp: 20, dens: 1.005,  visc: 1.25  },
  { nombre: "Floculante aniónico 0.1%",    conc: 0.1,  temp: 20, dens: 1.001,  visc: 1.08  },
  { nombre: "Floculante aniónico 0.5%",    conc: 0.5,  temp: 20, dens: 1.005,  visc: 1.20  },
  { nombre: "Floculante aniónico 1%",      conc: 1.0,  temp: 20, dens: 1.010,  visc: 1.45  },
  { nombre: "Floculante aniónico 2%",      conc: 2.0,  temp: 20, dens: 1.020,  visc: 2.15  },
  { nombre: "Floculante catiónico 0.1%",   conc: 0.1,  temp: 20, dens: 1.001,  visc: 1.09  },
  { nombre: "Floculante catiónico 0.5%",   conc: 0.5,  temp: 20, dens: 1.005,  visc: 1.22  },
  { nombre: "Floculante catiónico 1%",     conc: 1.0,  temp: 20, dens: 1.010,  visc: 1.48  },
  { nombre: "Floculante catiónico 2%",     conc: 2.0,  temp: 20, dens: 1.020,  visc: 2.20  },
  { nombre: "Lodo TSS 1%",                 conc: 1.0,  temp: 20, dens: 1.010,  visc: 1.15  },
  { nombre: "Lodo TSS 2%",                 conc: 2.0,  temp: 20, dens: 1.020,  visc: 1.35  },
  { nombre: "Lodos 0.8%",                  conc: 0.8,  temp: 20, dens: 1.008,  visc: 1.12  },
  { nombre: "Lodos 2%",                    conc: 2.0,  temp: 20, dens: 1.020,  visc: 1.35  },
];

const MATERIALES_DEFAULT = [
  { nombre: "PVC",                  rug: 0.0015 },
  { nombre: "Acero carbono",        rug: 0.045  },
  { nombre: "Acero inoxidable 304", rug: 0.015  },
  { nombre: "Acero inoxidable 316", rug: 0.015  },
  { nombre: "HDPE",                 rug: 0.007  },
  { nombre: "Hierro fundido",       rug: 0.26   },
];

const DIAMETROS_DEFAULT = [
  // ── Serie NPS ────────────────────────────────────────────
  { nom: '1/4"',   interno_in: 0.364,  interno_mm: 9.25  },
  { nom: '3/8"',   interno_in: 0.493,  interno_mm: 12.52 },
  { nom: '1/2"',   interno_in: 0.622,  interno_mm: 15.80 },
  { nom: '3/4"',   interno_in: 0.824,  interno_mm: 20.93 },
  { nom: '1"',     interno_in: 1.049,  interno_mm: 26.64 },
  { nom: '1 1/4"', interno_in: 1.380,  interno_mm: 35.05 },
  { nom: '1 1/2"', interno_in: 1.610,  interno_mm: 40.89 },
  { nom: '2"',     interno_in: 2.067,  interno_mm: 52.50 },
  { nom: '2 1/2"', interno_in: 2.469,  interno_mm: 62.71 },
  { nom: '3"',     interno_in: 3.068,  interno_mm: 77.93 },
  { nom: '4"',     interno_in: 4.026,  interno_mm: 102.26},
  { nom: '5"',     interno_in: 5.047,  interno_mm: 128.19},
  { nom: '6"',     interno_in: 6.065,  interno_mm: 154.05},
  { nom: '8"',     interno_in: 7.981,  interno_mm: 202.72},
  { nom: '10"',    interno_in: 10.020, interno_mm: 254.51},
  { nom: '12"',    interno_in: 11.938, interno_mm: 303.23},
  { nom: '14"',    interno_in: 13.124, interno_mm: 333.35},
  { nom: '16"',    interno_in: 15.000, interno_mm: 381.00},
  { nom: '18"',    interno_in: 16.876, interno_mm: 428.65},
  { nom: '20"',    interno_in: 18.812, interno_mm: 477.82},
  { nom: '24"',    interno_in: 22.624, interno_mm: 574.65},
  // ── Serie DN métrica ─────────────────────────────────────
  { nom: 'DN 20',  interno_in: 0.787,  interno_mm: 20.0  },
  { nom: 'DN 25',  interno_in: 0.984,  interno_mm: 25.0  },
  { nom: 'DN 32',  interno_in: 1.260,  interno_mm: 32.0  },
  { nom: 'DN 40',  interno_in: 1.575,  interno_mm: 40.0  },
  { nom: 'DN 50',  interno_in: 1.969,  interno_mm: 50.0  },
  { nom: 'DN 63',  interno_in: 2.480,  interno_mm: 63.0  },
  { nom: 'DN 75',  interno_in: 2.953,  interno_mm: 75.0  },
  { nom: 'DN 90',  interno_in: 3.543,  interno_mm: 90.0  },
  { nom: 'DN 110', interno_in: 4.331,  interno_mm: 110.0 },
  { nom: 'DN 125', interno_in: 4.921,  interno_mm: 125.0 },
  { nom: 'DN 140', interno_in: 5.512,  interno_mm: 140.0 },
  { nom: 'DN 160', interno_in: 6.299,  interno_mm: 160.0 },
  { nom: 'DN 200', interno_in: 7.874,  interno_mm: 200.0 },
  { nom: 'DN 250', interno_in: 9.843,  interno_mm: 250.0 },
  { nom: 'DN 315', interno_in: 12.402, interno_mm: 315.0 },
  { nom: 'DN 355', interno_in: 13.976, interno_mm: 355.0 },
  { nom: 'DN 400', interno_in: 15.748, interno_mm: 400.0 },
  { nom: 'DN 450', interno_in: 17.717, interno_mm: 450.0 },
  { nom: 'DN 500', interno_in: 19.685, interno_mm: 500.0 },
  { nom: 'DN 630', interno_in: 24.803, interno_mm: 630.0 },
];

const K_ACCESORIOS_DEFAULT = {
  'Codo 90°':          0.9,
  'Codo 45°':          0.4,
  'Válvula compuerta': 0.2,
  'Válvula globo':     10.0,
  'Válvula check':     2.5,
  'Tee':               1.8,
  'Entrada brusca':    0.5,
  'Salida brusca':     1.0,
};

// ═══════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════

window.STATE = {
  // Parámetros globales
  Q: 5,
  Q_unidad: 'm3h',    // 'm3h' | 'ls' | 'gpm'
  Q_min: 3,
  Q_max: 10,
  fluido_idx: 0,
  temperatura: 20,
  num_tramos: 2,

  // Array de tramos
  tramos: [],

  // Resultados del último cálculo
  resultados: null,

  // Tablas editables (persistidas en localStorage)
  fluidos: [],
  materiales: [],
  diametros: [],
  k_accesorios: {},
};

window.CONFIG = {
  Patm: 101325,      // Pa
  Pvapor_override: null,  // null = usar Antoine; número = valor manual en Pa
  g: 9.81,
};

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN DEL ESTADO
// ═══════════════════════════════════════════════════════════════

function _tramoVacio(idx) {
  return {
    descripcion: idx === 0 ? 'Succión' : 'Descarga',
    L: 10,
    L_unidad: 'm',
    dz: idx === 0 ? -2 : 8,
    dz_unidad: 'm',
    diametro_idx: 7,   // 2" por defecto
    material_idx: 0,   // PVC por defecto
    accesorios: [],
    reduccion: { activa: false, D_mayor: 0, D_menor: 0, cantidad: 0 },
    separador: { activo: false, nombre: '', dP: 0, dP_unidad: 'bar' },
  };
}

function inicializarEstado() {
  STATE.fluidos      = JSON.parse(JSON.stringify(FLUIDOS_DEFAULT));
  STATE.materiales   = JSON.parse(JSON.stringify(MATERIALES_DEFAULT));
  STATE.diametros    = JSON.parse(JSON.stringify(DIAMETROS_DEFAULT));
  STATE.k_accesorios = JSON.parse(JSON.stringify(K_ACCESORIOS_DEFAULT));

  // Tramo 1 — Succión con accesorios iniciales
  const t1 = _tramoVacio(0);
  t1.descripcion = 'Succión';
  t1.L = 10; t1.dz = -2;
  t1.accesorios = [
    { tipo: 'Entrada brusca', cantidad: 1 },
    { tipo: 'Válvula check',  cantidad: 1 },
  ];

  // Tramo 2 — Descarga con accesorios iniciales
  const t2 = _tramoVacio(1);
  t2.descripcion = 'Descarga';
  t2.L = 20; t2.dz = 8;
  t2.accesorios = [
    { tipo: 'Codo 90°',          cantidad: 2 },
    { tipo: 'Válvula compuerta', cantidad: 1 },
    { tipo: 'Salida brusca',     cantidad: 1 },
  ];

  STATE.tramos = [t1, t2];
  STATE.num_tramos = 2;
}

// ═══════════════════════════════════════════════════════════════
// CONVERSIÓN DE UNIDADES
// ═══════════════════════════════════════════════════════════════

function convertirQ(valor, unidad) {
  // Devuelve m³/s
  const v = parseFloat(valor) || 0;
  switch (unidad) {
    case 'm3h': return v / 3600;
    case 'ls':  return v / 1000;
    case 'gpm': return v * 6.30902e-5;
    default:    return v / 3600;
  }
}

function convertirQ_a_m3h(valor, unidad) {
  // Convierte a m³/h para mostrar en ejes
  const v = parseFloat(valor) || 0;
  switch (unidad) {
    case 'm3h': return v;
    case 'ls':  return v * 3.6;
    case 'gpm': return v * 0.227125;
    default:    return v;
  }
}

function convertirLongitud(valor, unidad) {
  // Devuelve metros
  const v = parseFloat(valor) || 0;
  return unidad === 'ft' ? v * 0.3048 : v;
}

function convertirPresion(valor, unidad) {
  // Devuelve Pa
  const v = parseFloat(valor) || 0;
  switch (unidad) {
    case 'bar': return v * 1e5;
    case 'psi': return v * 6894.76;
    case 'kPa': return v * 1000;
    case 'Pa':  return v;
    default:    return v;
  }
}

function obtenerFluido() {
  const f = STATE.fluidos[STATE.fluido_idx] || STATE.fluidos[0];
  return {
    dens_kg_m3: f.dens * 1000,    // kg/L → kg/m³
    visc_Pa_s:  f.visc * 1e-3,    // cP → Pa·s
    nombre: f.nombre,
  };
}

function obtenerDiametroInterno_m(tramoIdx) {
  const t = STATE.tramos[tramoIdx];
  const d = STATE.diametros[t.diametro_idx] || STATE.diametros[7];
  return d.interno_mm / 1000;  // mm → m
}

function obtenerRugosidad_m(tramoIdx) {
  const t = STATE.tramos[tramoIdx];
  const m = STATE.materiales[t.material_idx] || STATE.materiales[0];
  return m.rug / 1000;  // mm → m
}

// ═══════════════════════════════════════════════════════════════
// PERSISTENCIA EN localStorage
// ═══════════════════════════════════════════════════════════════

const LS_KEY_STATE  = 'hidraulica_state';
const LS_KEY_CONFIG = 'hidraulica_config';

function guardarEnLocalStorage() {
  try {
    const toSave = {
      Q: STATE.Q, Q_unidad: STATE.Q_unidad,
      Q_min: STATE.Q_min, Q_max: STATE.Q_max,
      fluido_idx: STATE.fluido_idx,
      temperatura: STATE.temperatura,
      num_tramos: STATE.num_tramos,
      tramos: STATE.tramos,
      fluidos: STATE.fluidos,
      materiales: STATE.materiales,
      diametros: STATE.diametros,
      k_accesorios: STATE.k_accesorios,
    };
    localStorage.setItem(LS_KEY_STATE, JSON.stringify(toSave));
    localStorage.setItem(LS_KEY_CONFIG, JSON.stringify(CONFIG));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e.message);
  }
}

function cargarDesdeLocalStorage() {
  inicializarEstado();  // valores por defecto primero
  try {
    const raw = localStorage.getItem(LS_KEY_STATE);
    if (raw) {
      const saved = JSON.parse(raw);
      Object.assign(STATE, saved);
    }
    const rawCfg = localStorage.getItem(LS_KEY_CONFIG);
    if (rawCfg) {
      const savedCfg = JSON.parse(rawCfg);
      Object.assign(CONFIG, savedCfg);
    }
  } catch (e) {
    console.warn('Error cargando localStorage; usando valores por defecto:', e.message);
    inicializarEstado();
  }
}

function fmt(val, dec = 3) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('es-PE', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmt2(val) { return fmt(val, 2); }
function fmt0(val) { return fmt(val, 0); }
