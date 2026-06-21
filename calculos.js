/**
 * calculos.js — Motor hidráulico: Darcy-Weisbach, Colebrook-White, NPSHd
 * Calculadora Hidráulica de Sistemas de Bombeo
 */

"use strict";

// ═══════════════════════════════════════════════════════════════
// PROPIEDADES FÍSICAS
// ═══════════════════════════════════════════════════════════════

function pvaporAntoine(T_C) {
  // Ecuación de Antoine para agua (T en °C) → Pa
  const log10P_mmHg = 8.07131 - 1730.63 / (233.426 + T_C);
  const P_mmHg = Math.pow(10, log10P_mmHg);
  return P_mmHg * 133.322;  // Pa
}

function obtenerPvapor() {
  if (CONFIG.Pvapor_override !== null && CONFIG.Pvapor_override > 0) {
    return CONFIG.Pvapor_override;
  }
  return pvaporAntoine(STATE.temperatura);
}

// ═══════════════════════════════════════════════════════════════
// FACTOR DE FRICCIÓN (Colebrook-White)
// ═══════════════════════════════════════════════════════════════

function factorFriccion(Re, eps_rel) {
  if (Re < 2300) {
    // Laminar
    return 64 / Re;
  }
  if (Re >= 4000) {
    // Turbulento — Colebrook-White iterativo
    return _colebrookWhite(Re, eps_rel);
  }
  // Transición: interpolación lineal
  const f_lam = 64 / 2300;
  const f_tur = _colebrookWhite(4000, eps_rel);
  const t = (Re - 2300) / (4000 - 2300);
  return f_lam + t * (f_tur - f_lam);
}

function _colebrookWhite(Re, eps_rel) {
  // 1/√f = −2·log₁₀(ε/(3.7·D) + 2.51/(Re·√f))
  // Iteración de punto fijo; converge en < 30 ciclos
  let f = 0.02;  // semilla
  for (let i = 0; i < 100; i++) {
    const sqrtF = Math.sqrt(f);
    const rhs = -2.0 * Math.log10(eps_rel / 3.7 + 2.51 / (Re * sqrtF));
    const f_nuevo = 1.0 / (rhs * rhs);
    if (Math.abs(f_nuevo - f) < 1e-8) { f = f_nuevo; break; }
    f = f_nuevo;
  }
  return f;
}

function regimenNombre(Re) {
  if (Re < 2300)  return 'Laminar';
  if (Re < 4000)  return 'Transición';
  return 'Turbulento';
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULO POR TRAMO
// ═══════════════════════════════════════════════════════════════

function calcularTramo(tramoIdx, Q_m3s) {
  const t   = STATE.tramos[tramoIdx];
  const flu = obtenerFluido();
  const g   = CONFIG.g;

  const D   = obtenerDiametroInterno_m(tramoIdx);           // m
  const eps = obtenerRugosidad_m(tramoIdx);                 // m
  const L   = convertirLongitud(t.L, t.L_unidad);          // m
  const dz  = convertirLongitud(t.dz, t.dz_unidad);        // m
  const rho = flu.dens_kg_m3;                               // kg/m³
  const mu  = flu.visc_Pa_s;                                // Pa·s

  // 1. Área transversal
  const A = Math.PI * D * D / 4;  // m²

  // 2. Velocidad
  const V = Q_m3s / A;  // m/s

  // 3. Reynolds
  const Re = (rho * V * D) / mu;

  // 4. Factor de fricción
  const eps_rel = eps / D;
  const f = factorFriccion(Re, eps_rel);

  // 5. Pérdida por fricción (Darcy-Weisbach)
  const hf = f * (L / D) * (V * V / (2 * g));  // m

  // 6. Coeficientes K locales por accesorios
  let K_total = 0;
  for (const acc of t.accesorios) {
    const K = STATE.k_accesorios[acc.tipo] ?? 0;
    K_total += K * (parseInt(acc.cantidad) || 0);
  }

  // 7. Reducción brusca (si aplica)
  if (t.reduccion && t.reduccion.activa && t.reduccion.D_mayor > 0 && t.reduccion.D_menor > 0) {
    const beta_sq = Math.pow(t.reduccion.D_menor / t.reduccion.D_mayor, 2);
    const K_red = Math.pow(1 - beta_sq, 2);
    K_total += K_red * (parseInt(t.reduccion.cantidad) || 1);
  }

  // 8. Pérdidas menores
  const hs = K_total * (V * V / (2 * g));  // m

  // 9. Elemento separador (caída de presión adicional)
  let dP_sep_m = 0;
  if (t.separador && t.separador.activo && t.separador.dP > 0) {
    const dP_Pa = convertirPresion(t.separador.dP, t.separador.dP_unidad);
    dP_sep_m = dP_Pa / (rho * g);
  }

  // 10. ADT parcial del tramo
  const ADT_tramo = dz + hf + hs + dP_sep_m;

  return {
    idx: tramoIdx,
    descripcion: t.descripcion,
    D_mm: D * 1000,
    L_m: L,
    dz_m: dz,
    V,
    Re,
    regimen: regimenNombre(Re),
    f,
    eps_rel,
    hf,
    K_total,
    hs,
    dP_sep_m,
    ADT_tramo,
  };
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULO COMPLETO DEL SISTEMA
// ═══════════════════════════════════════════════════════════════

function calcularSistema(Q_m3s_override) {
  const Q_m3s = Q_m3s_override !== undefined
    ? Q_m3s_override
    : convertirQ(STATE.Q, STATE.Q_unidad);

  const resultadosTramos = [];
  let ADT_total = 0;

  for (let i = 0; i < STATE.tramos.length; i++) {
    const res = calcularTramo(i, Q_m3s);
    resultadosTramos.push(res);
    ADT_total += res.ADT_tramo;
  }

  // NPSHd — usa el tramo 0 (succión)
  const NPSHd = _calcularNPSHd(resultadosTramos[0], Q_m3s);

  return {
    Q_m3s,
    Q_m3h: Q_m3s * 3600,
    ADT_total,
    NPSHd,
    tramos: resultadosTramos,
    fluido: obtenerFluido(),
    Pvapor_Pa: obtenerPvapor(),
    Patm_Pa: CONFIG.Patm,
  };
}

function _calcularNPSHd(tramoSuccion, Q_m3s) {
  if (!tramoSuccion) return null;
  const flu = obtenerFluido();
  const rho = flu.dens_kg_m3;
  const g   = CONFIG.g;
  const Patm   = CONFIG.Patm;
  const Pvapor = obtenerPvapor();

  // NPSHd = (Patm − Pvapor)/(ρ·g) + Δz_succión − hf_succión − hs_succión
  // Δz_succión negativo si la bomba está por encima del depósito de succión
  return (Patm - Pvapor) / (rho * g) + tramoSuccion.dz_m - tramoSuccion.hf - tramoSuccion.hs;
}

// ═══════════════════════════════════════════════════════════════
// ANÁLISIS DE RANGO (7 puntos equiespaciados)
// ═══════════════════════════════════════════════════════════════

function calcularRango() {
  const Q_min_m3s = convertirQ(STATE.Q_min, STATE.Q_unidad);
  const Q_max_m3s = convertirQ(STATE.Q_max, STATE.Q_unidad);
  const N = 7;
  const step = (Q_max_m3s - Q_min_m3s) / (N - 1);

  const puntos = [];
  for (let i = 0; i < N; i++) {
    const Q = Q_min_m3s + i * step;
    const r = calcularSistema(Q);

    // Velocidad media ponderada por longitud
    let V_sum_L = 0, L_sum = 0;
    for (const tr of r.tramos) {
      V_sum_L += tr.V * tr.L_m;
      L_sum   += tr.L_m;
    }
    const V_media = L_sum > 0 ? V_sum_L / L_sum : 0;

    puntos.push({
      Q_m3s:    Q,
      Q_m3h:    Q * 3600,
      ADT:      r.ADT_total,
      NPSHd:    r.NPSHd,
      V_media,
    });
  }
  return puntos;
}

// ═══════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL EXPUESTA
// ═══════════════════════════════════════════════════════════════

function calcular() {
  try {
    const principal = calcularSistema();
    const rango     = calcularRango();
    STATE.resultados = { principal, rango };
    return STATE.resultados;
  } catch (e) {
    console.error('Error en cálculo:', e);
    throw new Error('Error en el motor de cálculo: ' + e.message);
  }
}
