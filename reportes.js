/**
 * reportes.js — Exportación PDF (jsPDF) y Excel (SheetJS) en el cliente
 * Calculadora Hidráulica de Sistemas de Bombeo
 */

"use strict";

// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN PDF (jsPDF)
// ═══════════════════════════════════════════════════════════════

async function generarPDF(infoProyecto) {
  if (!STATE.resultados) throw new Error('No hay resultados calculados. Ejecute el cálculo primero.');
  if (typeof window.jspdf === 'undefined') throw new Error('jsPDF no está disponible. Verifique la conexión a Internet.');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 15;
  const COL_W  = PAGE_W - 2 * MARGIN;
  let y = MARGIN;

  const COLOR_AZUL   = [13, 71, 161];
  const COLOR_GRIS   = [97, 97, 97];
  const COLOR_NEGRO  = [33, 33, 33];
  const COLOR_BG     = [232, 240, 254];

  function checkPage(needed = 15) {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function titulo(texto, size = 14) {
    checkPage(12);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_AZUL);
    doc.text(texto, MARGIN, y);
    y += size * 0.4 + 3;
    doc.setDrawColor(...COLOR_AZUL);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, MARGIN + COL_W, y);
    y += 4;
    doc.setTextColor(...COLOR_NEGRO);
  }

  function subtitulo(texto) {
    checkPage(8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_GRIS);
    doc.text(texto, MARGIN, y);
    y += 6;
    doc.setTextColor(...COLOR_NEGRO);
  }

  function fila(label, valor, unidad = '') {
    checkPage(6);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(label + ':', MARGIN, y);
    doc.setFont('helvetica', 'bold');
    doc.text(String(valor), MARGIN + 65, y);
    if (unidad) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR_GRIS);
      doc.text(unidad, MARGIN + 90, y);
      doc.setTextColor(...COLOR_NEGRO);
    }
    y += 5;
  }

  function cajaDestacada(label, valor, unidad = '') {
    checkPage(14);
    doc.setFillColor(...COLOR_BG);
    doc.roundedRect(MARGIN, y, COL_W, 12, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_GRIS);
    doc.text(label, MARGIN + 4, y + 5);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_AZUL);
    doc.text(String(valor) + (unidad ? ' ' + unidad : ''), MARGIN + 4, y + 10);
    doc.setTextColor(...COLOR_NEGRO);
    y += 16;
  }

  // ── 1. PORTADA ────────────────────────────────────────────────
  doc.setFillColor(...COLOR_AZUL);
  doc.rect(0, 0, PAGE_W, 50, 'F');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('MEMORIA DE CÁLCULO HIDRÁULICO', PAGE_W / 2, 22, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Bombeo Centrífugo', PAGE_W / 2, 30, { align: 'center' });
  doc.setFontSize(9);
  doc.text('Generado: ' + new Date().toLocaleString('es-PE'), PAGE_W / 2, 38, { align: 'center' });

  y = 60;
  doc.setTextColor(...COLOR_NEGRO);

  // Datos del proyecto
  titulo('DATOS DEL PROYECTO', 12);
  fila('Proyecto',              infoProyecto.nombre || '—');
  fila('Descripción de bomba',  infoProyecto.bomba || '—');
  fila('Tag de equipo',         infoProyecto.tag || '—');
  fila('Versión',               infoProyecto.version || '1.0');
  fila('Ingeniero responsable', infoProyecto.ingeniero || '—');
  y += 4;

  // ── 2. DATOS DE ENTRADA ───────────────────────────────────────
  titulo('DATOS DE ENTRADA');
  const { principal } = STATE.resultados;

  subtitulo('Parámetros Globales');
  fila('Caudal de diseño (Q)', fmt(STATE.Q, 3), STATE.Q_unidad === 'm3h' ? 'm³/h' : STATE.Q_unidad === 'ls' ? 'L/s' : 'GPM');
  fila('Q mínimo',             fmt(STATE.Q_min, 3), 'm³/h eq.');
  fila('Q máximo',             fmt(STATE.Q_max, 3), 'm³/h eq.');
  fila('Fluido',               principal.fluido.nombre);
  fila('Temperatura',          STATE.temperatura, '°C');
  fila('Número de tramos',     STATE.num_tramos);
  y += 4;

  // ── 3. PROPIEDADES DEL FLUIDO ─────────────────────────────────
  subtitulo('Propiedades del Fluido y Sistema');
  fila('Densidad (ρ)',          fmt(principal.fluido.dens_kg_m3, 2), 'kg/m³');
  fila('Viscosidad dinámica (μ)', fmt(principal.fluido.dens_kg_m3 > 0 ? STATE.fluidos[STATE.fluido_idx]?.visc : 0, 3), 'cP');
  fila('Presión vapor (Pvapor)', fmt(principal.Pvapor_Pa, 1), 'Pa');
  fila('Presión atmosférica (Patm)', fmt(CONFIG.Patm, 0), 'Pa');
  fila('Gravedad (g)',          fmt(CONFIG.g, 2), 'm/s²');
  y += 4;

  // Datos por tramo
  subtitulo('Datos por Tramo');
  for (const t of STATE.tramos) {
    checkPage(20);
    const dNom = STATE.diametros[t.diametro_idx]?.nom || '—';
    const dInt = STATE.diametros[t.diametro_idx]?.interno_mm || 0;
    const mat  = STATE.materiales[t.material_idx]?.nombre || '—';
    const rug  = STATE.materiales[t.material_idx]?.rug || 0;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Tramo ${t === STATE.tramos[0] ? 1 : STATE.tramos.indexOf(t) + 1}: ${t.descripcion}`, MARGIN + 2, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    fila('  Longitud', fmt(t.L, 2), t.L_unidad);
    fila('  Altura estática (Δz)', fmt(t.dz, 2), t.dz_unidad);
    fila('  Diámetro nominal', dNom + ` → D_int = ${fmt(dInt, 2)} mm`);
    fila('  Material', mat + ` (ε = ${rug} mm)`);
    if (t.accesorios.length > 0) {
      fila('  Accesorios', t.accesorios.map(a => `${a.cantidad}× ${a.tipo}`).join(', '));
    }
  }
  y += 4;

  // ── 4. ECUACIONES APLICADAS ───────────────────────────────────
  checkPage(50);
  titulo('ECUACIONES APLICADAS');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const ecs = [
    ['Área sección',     'A = π · D_int² / 4',                                 'm²'],
    ['Velocidad',        'V = Q / A',                                           'm/s'],
    ['Reynolds',         'Re = (ρ · V · D_int) / μ',                           '—'],
    ['Laminar (Re<2300)','f = 64 / Re',                                         '—'],
    ['Turbulento',       '1/√f = −2·log₁₀(ε/(3.7D) + 2.51/(Re·√f))',          '—'],
    ['Darcy-Weisbach',   'hf = f · (L/D) · V²/(2g)',                           'm'],
    ['Pérd. menores',    'hs = K_total · V²/(2g)',                              'm'],
    ['ADT tramo',        'ADT_tramo = Δz + hf + hs + ΔP_sep/(ρg)',             'm'],
    ['NPSHd',            'NPSHd = (Patm−Pvapor)/(ρg) + Δz_suc − hf_suc − hs_suc','m'],
    ['Antoine',          'log₁₀(P_mmHg) = 8.07131 − 1730.63/(233.426+T)',      '→ Pa'],
  ];

  for (const [nombre, ec, und] of ecs) {
    checkPage(6);
    doc.setFont('helvetica', 'bold');
    doc.text(nombre + ':', MARGIN, y);
    doc.setFont('courier', 'normal');
    doc.text(ec, MARGIN + 42, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_GRIS);
    doc.text('[' + und + ']', MARGIN + COL_W - 15, y);
    doc.setTextColor(...COLOR_NEGRO);
    y += 5.5;
  }
  y += 4;

  // ── 5. DESARROLLO DEL CÁLCULO ─────────────────────────────────
  titulo('DESARROLLO DEL CÁLCULO — Q = ' + fmt(principal.Q_m3h, 3) + ' m³/h');
  for (const tr of principal.tramos) {
    checkPage(40);
    subtitulo(`Tramo ${tr.idx + 1}: ${tr.descripcion}`);
    fila('Diámetro interno (D)', fmt(tr.D_mm, 2), 'mm');
    fila('Longitud (L)',          fmt(tr.L_m, 2), 'm');
    fila('Δz',                    fmt(tr.dz_m, 3), 'm');
    fila('Velocidad (V)',          fmt(tr.V, 4), 'm/s');
    fila('Reynolds (Re)',          fmt(tr.Re, 0), '—');
    fila('Régimen',                tr.regimen);
    fila('Factor de fricción (f)', fmt(tr.f, 6), '—');
    fila('Pérd. fricción (hf)',    fmt(tr.hf, 4), 'm');
    fila('K total accesorios',     fmt(tr.K_total, 3), '—');
    fila('Pérd. menores (hs)',     fmt(tr.hs, 4), 'm');
    if (tr.dP_sep_m > 0) fila('ΔP separador', fmt(tr.dP_sep_m, 4), 'm');
    fila('ADT parcial',            fmt(tr.ADT_tramo, 4), 'm');
    y += 3;
  }

  // ── 6. TABLA RESUMEN ─────────────────────────────────────────
  checkPage(40);
  titulo('TABLA RESUMEN DE RESULTADOS');
  const headers = ['Tramo', 'V (m/s)', 'Re', 'Régimen', 'hf (m)', 'hs (m)', 'ADT_p (m)'];
  const colW = [28, 22, 22, 28, 20, 20, 22];
  let xh = MARGIN;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(...COLOR_BG);
  doc.rect(MARGIN, y, COL_W, 7, 'F');
  for (let c = 0; c < headers.length; c++) {
    doc.text(headers[c], xh + 1, y + 5);
    xh += colW[c];
  }
  y += 7;

  for (const tr of principal.tramos) {
    checkPage(8);
    doc.setFont('helvetica', 'normal');
    const row = [
      tr.descripcion,
      fmt(tr.V, 3),
      fmt0(tr.Re),
      tr.regimen,
      fmt(tr.hf, 3),
      fmt(tr.hs, 3),
      fmt(tr.ADT_tramo, 3),
    ];
    let xr = MARGIN;
    for (let c = 0; c < row.length; c++) {
      doc.text(row[c], xr + 1, y + 5);
      xr += colW[c];
    }
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN, y + 7, MARGIN + COL_W, y + 7);
    y += 7;
  }
  y += 6;

  // ── 7. GRÁFICAS ───────────────────────────────────────────────
  try {
    const grafIdList = ['graf-adt-q', 'graf-npshd-q', 'graf-barras'];
    const nombres    = ['Curva del Sistema ADT vs. Q', 'NPSHd vs. Q', 'Pérdidas por Tramo'];
    for (let g = 0; g < grafIdList.length; g++) {
      const el = document.getElementById(grafIdList[g]);
      if (!el) continue;
      const png = await Plotly.toImage(el, { format: 'png', width: 700, height: 350 });
      checkPage(80);
      if (g === 0) titulo('GRÁFICAS DEL SISTEMA');
      subtitulo(nombres[g]);
      doc.addImage(png, 'PNG', MARGIN, y, COL_W, COL_W * 0.5);
      y += COL_W * 0.5 + 6;
    }
  } catch (e) {
    checkPage(10);
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_GRIS);
    doc.text('(Gráficas no disponibles — calcule primero desde la Pestaña 1)', MARGIN, y);
    doc.setTextColor(...COLOR_NEGRO);
    y += 8;
  }

  // ── 8. CONCLUSIONES ───────────────────────────────────────────
  checkPage(30);
  titulo('CONCLUSIONES');
  cajaDestacada('ADT TOTAL DEL SISTEMA', fmt(principal.ADT_total, 3), 'm');
  cajaDestacada('NPSHd CALCULADO',        fmt(principal.NPSHd, 3), 'm');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  for (const tr of principal.tramos) {
    checkPage(6);
    doc.text(`• Tramo ${tr.idx + 1} (${tr.descripcion}): régimen ${tr.regimen} (Re = ${fmt0(tr.Re)})`, MARGIN, y);
    y += 5;
  }

  if (principal.NPSHd < 0) {
    checkPage(8);
    doc.setTextColor(183, 28, 28);
    doc.text('⚠ ADVERTENCIA: NPSHd negativo — riesgo de cavitación. Revisar condiciones de succión.', MARGIN, y);
    doc.setTextColor(...COLOR_NEGRO);
    y += 6;
  }

  // Numeración de páginas
  const totalPags = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPags; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_GRIS);
    doc.text(`Página ${p} de ${totalPags}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
    doc.text('Calculadora Hidráulica · ' + (infoProyecto.nombre || ''), MARGIN, PAGE_H - 8);
  }

  const filename = `memoria_hidraulica_${(infoProyecto.tag || 'bomba').replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN EXCEL (SheetJS)
// ═══════════════════════════════════════════════════════════════

function generarExcel(infoProyecto) {
  if (!STATE.resultados) throw new Error('No hay resultados calculados. Ejecute el cálculo primero.');
  if (typeof XLSX === 'undefined') throw new Error('SheetJS no está disponible. Verifique la conexión a Internet.');

  const wb = XLSX.utils.book_new();
  const { principal, rango } = STATE.resultados;

  // ── Hoja 1: Datos de Entrada ──────────────────────────────────
  const wsEntrada = [
    ['Parámetro', 'Valor', 'Unidad', 'Descripción'],
    ['Caudal de diseño (Q)', STATE.Q, STATE.Q_unidad, 'Caudal nominal de operación'],
    ['Q mínimo', STATE.Q_min, STATE.Q_unidad, 'Límite inferior del análisis de rango'],
    ['Q máximo', STATE.Q_max, STATE.Q_unidad, 'Límite superior del análisis de rango'],
    ['Fluido', principal.fluido.nombre, '—', 'Fluido de proceso'],
    ['Temperatura', STATE.temperatura, '°C', 'Temperatura del fluido'],
    ['Número de tramos', STATE.num_tramos, '—', 'Segmentos de tubería'],
    ['Nombre del proyecto', infoProyecto.nombre, '—', ''],
    ['Tag de equipo', infoProyecto.tag, '—', ''],
    ['Versión', infoProyecto.version, '—', ''],
    ['Ingeniero', infoProyecto.ingeniero, '—', ''],
    [],
    ['TRAMOS', '', '', ''],
    ...STATE.tramos.flatMap((t, i) => {
      const dNom = STATE.diametros[t.diametro_idx]?.nom || '—';
      const mat  = STATE.materiales[t.material_idx]?.nombre || '—';
      return [
        [`Tramo ${i + 1} — Descripción`, t.descripcion, '', ''],
        [`Tramo ${i + 1} — Longitud`, t.L, t.L_unidad, ''],
        [`Tramo ${i + 1} — Altura Δz`, t.dz, t.dz_unidad, ''],
        [`Tramo ${i + 1} — Diámetro nominal`, dNom, '—', `D_int = ${STATE.diametros[t.diametro_idx]?.interno_mm} mm`],
        [`Tramo ${i + 1} — Material`, mat, '—', `ε = ${STATE.materiales[t.material_idx]?.rug} mm`],
        [`Tramo ${i + 1} — Accesorios`, t.accesorios.map(a => `${a.cantidad}× ${a.tipo}`).join(', '), '', ''],
      ];
    }),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(wsEntrada);
  ws1['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 12 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Datos de Entrada');

  // ── Hoja 2: Resultados por Tramo ─────────────────────────────
  const filasTramos = [
    ['Tramo', 'Descripción', 'V (m/s)', 'Re', 'Régimen', 'hf (m)', 'hs (m)', 'ΔP_sep (m)', 'ADT_parcial (m)'],
    ...principal.tramos.map(tr => [
      tr.idx + 1,
      tr.descripcion,
      +tr.V.toFixed(3),
      Math.round(tr.Re),
      tr.regimen,
      +tr.hf.toFixed(3),
      +tr.hs.toFixed(3),
      +tr.dP_sep_m.toFixed(3),
      +tr.ADT_tramo.toFixed(3),
    ]),
    // Fila de totales
    ['TOTAL', '—', '—', '—', '—',
      +principal.tramos.reduce((s, t) => s + t.hf, 0).toFixed(3),
      +principal.tramos.reduce((s, t) => s + t.hs, 0).toFixed(3),
      +principal.tramos.reduce((s, t) => s + t.dP_sep_m, 0).toFixed(3),
      +principal.ADT_total.toFixed(3)],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(filasTramos);
  ws2['!cols'] = [8, 18, 12, 14, 14, 12, 12, 14, 18].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Resultados por Tramo');

  // ── Hoja 3: Análisis de Rango ─────────────────────────────────
  const filasRango = [
    ['Q (m³/h)', 'ADT (m)', 'NPSHd (m)', 'V_media (m/s)'],
    ...rango.map(p => [
      +p.Q_m3h.toFixed(3),
      +p.ADT.toFixed(3),
      p.NPSHd !== null ? +p.NPSHd.toFixed(3) : '—',
      +p.V_media.toFixed(3),
    ]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(filasRango);
  ws3['!cols'] = [14, 12, 14, 16].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws3, 'Análisis de Rango');

  // ── Hoja 4: Propiedades del Sistema ──────────────────────────
  const fluido = principal.fluido;
  const fluSel = STATE.fluidos[STATE.fluido_idx] || {};
  const wsProp = [
    ['Propiedad', 'Valor', 'Unidad'],
    ['Fluido', fluido.nombre, '—'],
    ['Concentración', fluSel.conc ?? '—', '%'],
    ['Densidad (ρ)', +fluido.dens_kg_m3.toFixed(3), 'kg/m³'],
    ['Viscosidad dinámica (μ)', +(fluSel.visc || 0).toFixed(3), 'cP'],
    ['Viscosidad dinámica (μ)', +(fluido.dens_kg_m3 > 0 ? (fluSel.visc || 0) * 1e-3 : 0).toFixed(6), 'Pa·s'],
    ['Temperatura', STATE.temperatura, '°C'],
    ['Presión vapor (Pvapor)', +principal.Pvapor_Pa.toFixed(1), 'Pa'],
    ['Presión atmosférica (Patm)', +CONFIG.Patm.toFixed(0), 'Pa'],
    ['Gravedad (g)', +CONFIG.g.toFixed(2), 'm/s²'],
    [],
    ['RESULTADOS GLOBALES', '', ''],
    ['ADT total', +principal.ADT_total.toFixed(3), 'm'],
    ['NPSHd',     principal.NPSHd !== null ? +principal.NPSHd.toFixed(3) : '—', 'm'],
    ['Q diseño',  +principal.Q_m3h.toFixed(3), 'm³/h'],
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(wsProp);
  ws4['!cols'] = [30, 16, 12].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws4, 'Propiedades del Sistema');

  const filename = `calculo_hidraulico_${(infoProyecto.tag || 'bomba').replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
