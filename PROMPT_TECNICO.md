# PROMPT TÉCNICO — Calculadora Hidráulica de Sistemas de Bombeo

> Documento que describe **completamente** el programa para que pueda ser recreado en
> cualquier plataforma o tecnología, con idéntico contenido técnico y funcional.

---

## 1. DESCRIPCIÓN GENERAL

Construye una **calculadora hidráulica web para sistemas de bombeo centrífugo** que:

- Calcula la **Altura Dinámica Total (ADT)** del sistema.
- Calcula el **NPSH disponible (NPSHd)** para evaluar riesgo de cavitación.
- Genera la **curva del sistema** (ADT vs. Q) y la curva NPSHd vs. Q para un rango de caudales.
- Modela sistemas de **2 a 5 tramos de tubería** en serie.
- Permite **seleccionar y superponer bombas comerciales** para encontrar el punto de operación.
- **Exporta** la memoria de cálculo en PDF (A4) y en Excel (4 hojas).
- Persiste todos los datos en el **navegador** (localStorage); es 100 % cliente, sin backend.

---

## 2. ARQUITECTURA GENERAL

```
Aplicación web estática (HTML + CSS + JS vanilla)
├── index.html      — UI completa + lógica de interfaz + datos de bombas comerciales
├── calculos.js     — Motor de cálculo hidráulico (Darcy-Weisbach, Colebrook-White, NPSHd)
├── datos.js        — Estado global, tablas por defecto, conversión de unidades, localStorage
├── reportes.js     — Generación de PDF (jsPDF) y Excel (SheetJS)
└── estilos.css     — Sistema de diseño visual completo
```

**Dependencias externas (CDN, sin instalación):**

| Librería | Versión | Uso |
|----------|---------|-----|
| Plotly.js | 2.32.0 | Gráficos interactivos |
| jsPDF | 2.5.1 | Exportación PDF en cliente |
| SheetJS (XLSX) | 0.20.1 | Exportación e importación Excel |

No requiere Node.js, bundler, ni servidor backend. Se sirve con cualquier servidor HTTP estático
(o directamente abriendo el HTML en un navegador moderno).

---

## 3. MOTOR DE CÁLCULO — ECUACIONES Y VARIABLES

### 3.1 Variables de entrada (por sistema)

| Variable | Descripción | Unidades soportadas | Valor por defecto |
|----------|-------------|---------------------|-------------------|
| Q | Caudal de diseño | m³/h, L/s, GPM | 5 m³/h |
| Q_min | Caudal mínimo del rango | misma unidad que Q | 3 m³/h |
| Q_max | Caudal máximo del rango | misma unidad que Q | 10 m³/h |
| fluido | Fluido de proceso | selector de tabla | Agua 20°C |
| T | Temperatura del fluido | °C | 20 °C |
| n_tramos | Número de tramos | entero 2–5 | 2 |
| Patm | Presión atmosférica | Pa, bar, atm | 101 325 Pa |
| Pvapor | Presión de vapor (override) | Pa, bar | Auto (Antoine) |
| g | Aceleración gravitacional | m/s² | 9.81 m/s² |

### 3.2 Variables de entrada (por tramo)

| Variable | Descripción | Unidades soportadas |
|----------|-------------|---------------------|
| descripcion | Etiqueta del tramo | texto libre |
| L | Longitud de tubería | m, ft |
| dz (Δz) | Altura estática (diferencia de cota) | m, ft (puede ser negativo) |
| D_nom | Diámetro nominal | selector de tabla NPS/DN |
| material | Material de tubería | selector de tabla (rugosidad ε) |
| accesorios | Lista de accesorios locales | tipo (selector) + cantidad |
| reduccion | Reducción brusca (opcional) | D_mayor, D_menor (mm), cantidad |
| separador | Elemento separador/filtro (opcional) | ΔP en bar, psi, kPa o Pa |

### 3.3 Propiedades del fluido

Las propiedades se toman de la tabla de fluidos:

| Propiedad | Unidad interna | Cómo se obtiene |
|-----------|---------------|-----------------|
| ρ (densidad) | kg/m³ | `dens` [kg/L] × 1000 |
| μ (viscosidad dinámica) | Pa·s | `visc` [cP] × 1×10⁻³ |

### 3.4 Conversión de unidades internas

```
Q_m3s = Q / 3600              (si unidad = m³/h)
Q_m3s = Q / 1000              (si unidad = L/s)
Q_m3s = Q × 6.30902×10⁻⁵     (si unidad = GPM)

L_m = L                       (si unidad = m)
L_m = L × 0.3048              (si unidad = ft)

ΔP_Pa = ΔP × 1×10⁵           (si unidad = bar)
ΔP_Pa = ΔP × 6894.76         (si unidad = psi)
ΔP_Pa = ΔP × 1000            (si unidad = kPa)
ΔP_Pa = ΔP                   (si unidad = Pa)
```

### 3.5 Presión de vapor — Ecuación de Antoine

Si no se ingresa override manual, se usa la ecuación de Antoine para agua:

```
log₁₀(P_mmHg) = 8.07131 − 1730.63 / (233.426 + T_C)
P_vapor_Pa    = 10^(log₁₀(P_mmHg)) × 133.322
```

Rango de validez: −20 °C a 150 °C.

### 3.6 Cálculo por tramo — Secuencia

Para cada tramo `i`, dado un caudal `Q` [m³/s]:

**Paso 1 — Diámetro y rugosidad internos:**
```
D   = D_interno_mm / 1000     (m)
ε   = rugosidad_mm  / 1000    (m)
```

**Paso 2 — Área de la sección transversal:**
```
A = π × D² / 4    (m²)
```

**Paso 3 — Velocidad media:**
```
V = Q / A    (m/s)
```

**Paso 4 — Número de Reynolds:**
```
Re = (ρ × V × D) / μ    (adimensional)
```

**Paso 5 — Régimen de flujo:**
```
Re < 2300         → Laminar
2300 ≤ Re < 4000  → Transición
Re ≥ 4000         → Turbulento
```

**Paso 6 — Factor de fricción de Darcy:**

*Flujo laminar (Hagen-Poiseuille):*
```
f = 64 / Re
```

*Flujo turbulento (Colebrook-White, iteración de punto fijo):*
```
1/√f = −2 · log₁₀( ε/(3.7·D) + 2.51/(Re·√f) )

Semilla inicial: f₀ = 0.02
Iteración: f_{n+1} = 1 / [ −2·log₁₀(ε/(3.7D) + 2.51/(Re·√fₙ)) ]²
Criterio de convergencia: |f_{n+1} − fₙ| < 1×10⁻⁸
Máximo: 100 iteraciones
```

*Flujo en transición (interpolación lineal):*
```
f_lam = 64 / 2300
f_tur = Colebrook-White(Re=4000, ε/D)
t = (Re − 2300) / (4000 − 2300)
f = f_lam + t × (f_tur − f_lam)
```

**Paso 7 — Pérdida por fricción (Darcy-Weisbach):**
```
hf = f × (L/D) × V²/(2g)    (m)
```

**Paso 8 — Coeficiente K total de pérdidas locales:**
```
K_total = Σ(Kᵢ × nᵢ) para todos los accesorios

Si reducción brusca activa:
  β² = (D_menor/D_mayor)²
  K_red = (1 − β²)²
  K_total += K_red × cantidad_reducciones
```

**Paso 9 — Pérdidas menores (accesorios):**
```
hs = K_total × V²/(2g)    (m)
```

**Paso 10 — Caída de presión de separador/filtro:**
```
Si separador activo y ΔP > 0:
  ΔP_sep_m = ΔP_Pa / (ρ × g)    (m)
Sino:
  ΔP_sep_m = 0
```

**Paso 11 — ADT parcial del tramo:**
```
ADT_tramo = Δz + hf + hs + ΔP_sep_m    (m)
```

**Variables de salida por tramo:**

| Variable | Descripción | Unidad |
|----------|-------------|--------|
| D_mm | Diámetro interno | mm |
| L_m | Longitud | m |
| dz_m | Altura estática | m |
| V | Velocidad media | m/s |
| Re | Número de Reynolds | — |
| regimen | Laminar / Transición / Turbulento | texto |
| f | Factor de fricción | — |
| eps_rel | Rugosidad relativa (ε/D) | — |
| hf | Pérdida por fricción | m |
| K_total | Suma de coeficientes K | — |
| hs | Pérdidas menores | m |
| dP_sep_m | Caída de presión separador | m |
| ADT_tramo | Altura dinámica parcial | m |

### 3.7 Cálculo del sistema completo

```
ADT_total = Σ(ADT_tramo)    para todos los tramos    (m)
```

### 3.8 NPSH Disponible (NPSHd)

Se calcula usando exclusivamente el **tramo 0 (succión)**:

```
NPSHd = (Patm − Pvapor) / (ρ × g)  +  Δz_suc  −  hf_suc  −  hs_suc    (m)
```

Donde:
- `(Patm − Pvapor) / (ρ·g)` → altura equivalente a la presión manométrica de vapor
- `Δz_suc` → desnivel del tramo de succión (negativo si bomba está por encima del depósito)
- `hf_suc`, `hs_suc` → pérdidas en el tramo de succión

**Alertas de cavitación:**
- NPSHd < 0 m → riesgo crítico (alerta roja)
- 0 ≤ NPSHd < 3 m → margen reducido (alerta naranja)
- NPSHd ≥ 3 m → seguro (sin alerta)

### 3.9 Análisis de rango (curva del sistema)

Se calculan **7 puntos equiespaciados** entre Q_min y Q_max:

```
step = (Q_max_m3s − Q_min_m3s) / 6

Para i = 0..6:
  Qᵢ = Q_min_m3s + i × step
  Resultado_i = calcularSistema(Qᵢ)  → {Q_m3h, ADT, NPSHd, V_media}

V_media = Σ(Vⱼ × Lⱼ) / Σ(Lⱼ)   (velocidad ponderada por longitud de tramo)
```

Salida: array de 7 objetos `{Q_m3s, Q_m3h, ADT, NPSHd, V_media}` para graficar curvas.

---

## 4. TABLAS DE DATOS POR DEFECTO

### 4.1 Fluidos (23 registros)

Estructura por registro: `{nombre, conc [%], temp [°C], dens [kg/L], visc [cP]}`

| Nombre | Conc (%) | ρ (kg/L) | μ (cP) |
|--------|----------|----------|--------|
| Agua 20°C | 0.0 | 0.9982 | 1.002 |
| NaOH 10% | 10.0 | 1.109 | 1.30 |
| NaOH 25% | 25.0 | 1.274 | 2.45 |
| NaOH 50% | 50.0 | 1.515 | 15.8 |
| H₂SO₄ 10% | 10.0 | 1.066 | 1.15 |
| H₂SO₄ 25% | 25.0 | 1.178 | 1.48 |
| H₂SO₄ 50% | 50.0 | 1.395 | 4.32 |
| Ácido sulfúrico concentrado | 98.0 | 1.834 | 26.7 |
| Soda cáustica concentrada | 50.0 | 1.515 | 15.8 |
| Floculante Al 0.1% | 0.1 | 1.001 | 1.10 |
| Floculante Al 0.5% | 0.5 | 1.005 | 1.25 |
| Floculante aniónico 0.1% | 0.1 | 1.001 | 1.08 |
| Floculante aniónico 0.5% | 0.5 | 1.005 | 1.20 |
| Floculante aniónico 1% | 1.0 | 1.010 | 1.45 |
| Floculante aniónico 2% | 2.0 | 1.020 | 2.15 |
| Floculante catiónico 0.1% | 0.1 | 1.001 | 1.09 |
| Floculante catiónico 0.5% | 0.5 | 1.005 | 1.22 |
| Floculante catiónico 1% | 1.0 | 1.010 | 1.48 |
| Floculante catiónico 2% | 2.0 | 1.020 | 2.20 |
| Lodo TSS 1% | 1.0 | 1.010 | 1.15 |
| Lodo TSS 2% | 2.0 | 1.020 | 1.35 |
| Lodos 0.8% | 0.8 | 1.008 | 1.12 |
| Lodos 2% | 2.0 | 1.020 | 1.35 |

### 4.2 Materiales (6 registros)

Estructura: `{nombre, rug [mm]}`

| Material | Rugosidad ε (mm) |
|----------|-----------------|
| PVC | 0.0015 |
| Acero carbono | 0.045 |
| Acero inoxidable 304 | 0.015 |
| Acero inoxidable 316 | 0.015 |
| HDPE | 0.007 |
| Hierro fundido | 0.26 |

### 4.3 Diámetros — Serie NPS (21 tamaños)

Estructura: `{nom, interno_in [pulg], interno_mm [mm]}`

| Nominal | Ø interno (mm) |
|---------|----------------|
| 1/4" | 9.25 |
| 3/8" | 12.52 |
| 1/2" | 15.80 |
| 3/4" | 20.93 |
| 1" | 26.64 |
| 1 1/4" | 35.05 |
| 1 1/2" | 40.89 |
| 2" | 52.50 |
| 2 1/2" | 62.71 |
| 3" | 77.93 |
| 4" | 102.26 |
| 5" | 128.19 |
| 6" | 154.05 |
| 8" | 202.72 |
| 10" | 254.51 |
| 12" | 303.23 |
| 14" | 333.35 |
| 16" | 381.00 |
| 18" | 428.65 |
| 20" | 477.82 |
| 24" | 574.65 |

### 4.4 Diámetros — Serie DN métrica (20 tamaños)

| DN | Ø interno (mm) |
|----|----------------|
| DN 20 | 20.0 |
| DN 25 | 25.0 |
| DN 32 | 32.0 |
| DN 40 | 40.0 |
| DN 50 | 50.0 |
| DN 63 | 63.0 |
| DN 75 | 75.0 |
| DN 90 | 90.0 |
| DN 110 | 110.0 |
| DN 125 | 125.0 |
| DN 140 | 140.0 |
| DN 160 | 160.0 |
| DN 200 | 200.0 |
| DN 250 | 250.0 |
| DN 315 | 315.0 |
| DN 355 | 355.0 |
| DN 400 | 400.0 |
| DN 450 | 450.0 |
| DN 500 | 500.0 |
| DN 630 | 630.0 |

### 4.5 Coeficientes K de accesorios (8 por defecto)

Estructura: diccionario `{nombre_accesorio: K}`

| Accesorio | K |
|-----------|---|
| Codo 90° | 0.9 |
| Codo 45° | 0.4 |
| Válvula compuerta | 0.2 |
| Válvula globo | 10.0 |
| Válvula check | 2.5 |
| Tee | 1.8 |
| Entrada brusca | 0.5 |
| Salida brusca | 1.0 |

Todas estas tablas son **editables en tiempo real** por el usuario (agregar/editar/eliminar filas,
importar y exportar como .xlsx).

---

## 5. ESTADO GLOBAL DE LA APLICACIÓN

El estado global (objeto `STATE`) contiene:

```
STATE = {
  Q              : number     // Caudal de diseño
  Q_unidad       : string     // 'm3h' | 'ls' | 'gpm'
  Q_min          : number     // Límite inferior del rango
  Q_max          : number     // Límite superior del rango
  fluido_idx     : int        // Índice en STATE.fluidos
  temperatura    : number     // °C
  num_tramos     : int        // 2–5

  tramos: [
    {
      descripcion : string
      L           : number
      L_unidad    : 'm' | 'ft'
      dz          : number    // puede ser negativo
      dz_unidad   : 'm' | 'ft'
      diametro_idx: int       // índice en STATE.diametros
      material_idx: int       // índice en STATE.materiales
      accesorios  : [{tipo: string, cantidad: int}, ...]
      reduccion   : {activa: bool, D_mayor: mm, D_menor: mm, cantidad: int}
      separador   : {activo: bool, nombre: string, dP: number, dP_unidad: string}
    },
    ...  // hasta 5 tramos
  ],

  resultados     : null | {principal, rango}   // último cálculo
  fluidos        : [...]    // tabla editable de fluidos
  materiales     : [...]    // tabla editable de materiales
  diametros      : [...]    // tabla editable de diámetros
  k_accesorios   : {...}    // tabla editable de coeficientes K
}

CONFIG = {
  Patm            : number    // Pa, por defecto 101325
  Pvapor_override : null|number  // Pa, null = usar Antoine
  g               : number    // m/s², por defecto 9.81
}
```

**Persistencia:** Se guarda en `localStorage` bajo las claves `hidraulica_state` y
`hidraulica_config`. Se carga automáticamente al iniciar la página. Los datos por defecto
se restauran si localStorage está vacío o corrupto.

**Tramo vacío por defecto:**
- Tramo 0 (Succión): L=10 m, dz=−2 m, diámetro 2", PVC, accesorios: {Entrada brusca ×1, Válvula check ×1}
- Tramo 1 (Descarga): L=20 m, dz=8 m, diámetro 2", PVC, accesorios: {Codo 90° ×2, Válvula compuerta ×1, Salida brusca ×1}

---

## 6. BOMBAS COMERCIALES

Dos fabricantes hardcodeados (representativos, no reales). Curvas en formato `[[Q_m3h, H_m], ...]`.

### Grundfos (5 modelos)

| Modelo | Curva Q (m³/h) → H (m) | η_max |
|--------|------------------------|-------|
| CM1-5 | 0→10, 1→9.5, 2→8.8, 3→7.8, 4→6.4, 5→4.6, 6→2.5, 7→0 | 42% |
| CM3-8 | 0→18, 2→17, 4→15.2, 6→12.5, 8→9, 10→5, 12→1 | 52% |
| CM5-4 | 0→26, 2→25, 4→23, 6→20, 8→16, 10→11, 12→5, 14→0 | 58% |
| CR5-10 | 0→52, 2→50, 4→47, 6→42, 8→35, 10→26, 12→15, 13→5 | 55% |
| NK 32-160 | 0→38, 5→36, 10→32, 15→26, 20→17, 25→7 | 65% |

### Pedrollo (5 modelos)

| Modelo | Curva Q (m³/h) → H (m) | η_max |
|--------|------------------------|-------|
| CP 160 | 0→14, 1→13.5, 2→12.8, 3→11.7, 4→10.2, 5→8.2, 6→5.8, 7→3, 8→0 | 40% |
| F25/160A | 0→22, 3→21, 5→19.5, 8→17, 10→14.5, 12→11, 14→7, 16→2 | 54% |
| 4SRm 4/8 | 0→28, 2→27, 4→25.5, 6→23, 8→19, 10→14, 12→8, 14→2 | 56% |
| F32/160A | 0→32, 5→30, 10→26, 15→20, 18→14, 20→8, 22→2 | 60% |
| HFm 5A | 0→40, 3→38, 5→36, 8→32, 10→28, 12→22, 14→15, 16→7 | 58% |

### Algoritmo del punto de operación

Intersección entre la curva del sistema y la curva H-Q de la bomba por **interpolación lineal**:

```
Para cada par de puntos adyacentes (Q₁, Hs₁) y (Q₂, Hs₂) de la curva del sistema:
  Hb₁ = interpolar(curva_bomba, Q₁)
  Hb₂ = interpolar(curva_bomba, Q₂)
  Si (Hb₁ - Hs₁) × (Hb₂ - Hs₂) < 0:  // cambio de signo → intersección
    t = (Hb₁ - Hs₁) / ((Hb₁ - Hs₁) - (Hb₂ - Hs₂))
    Q_op = Q₁ + t × (Q₂ - Q₁)
    H_op = Hs₁ + t × (Hs₂ - Hs₁)
    retornar {Q_op, H_op}

Interpolación lineal en la curva de bomba:
  Para par adyacente [xs[i], xs[i+1]]:
    t = (x - xs[i]) / (xs[i+1] - xs[i])
    y = ys[i] + t × (ys[i+1] - ys[i])
```

---

## 7. INTERFAZ GRÁFICA — ESTRUCTURA Y COMPONENTES

### 7.1 Estructura general

```
[HEADER sticky] — Título + subtítulo
[NAV TABS sticky] — 6 pestañas
[CONTENIDO ACTIVO] — cambia según pestaña
```

### 7.2 Pestaña 1 — Cálculo

Layout: **2 columnas** (sidebar fijo a la izquierda + área principal a la derecha)

**Sidebar (280 px):**
- Título "Parámetros Globales"
- Campo: Q (número + selector de unidad: m³/h / L/s / GPM)
- Campo: Q mínimo
- Campo: Q máximo
- Separador `<hr>`
- Campo: Fluido (selector `<select>` poblado dinámicamente desde tabla)
- Campo: Temperatura del fluido (°C)
- Separador `<hr>`
- Campo: Número de tramos (2–5); al cambiar, re-renderiza los paneles
- Botón CALCULAR (ancho completo, llamativo)
- Zona de alertas

**Área principal:**
- N paneles de tramo (`<details>` colapsables, abiertos por defecto)
  - Cada panel tiene `<summary>` con el nombre del tramo (actualiza en tiempo real)
  - Cuerpo en grid 2 columnas:
    - Descripción (campo full-width)
    - Longitud + unidad
    - Altura estática Δz + unidad
    - Diámetro nominal (select poblado desde tabla, muestra mm internos)
    - Material (select poblado desde tabla, muestra rugosidad)
    - Sección accesorios (full-width):
      - Lista dinámica de filas: [select tipo | número cantidad | botón ×]
      - Botón "+ Agregar accesorio"
    - Sección opcionales (full-width):
      - `<details>` "Reducción brusca": checkbox activa, D_mayor, D_menor, cantidad
      - `<details>` "Elemento separador / ΔP adicional": checkbox activa, nombre, ΔP + unidad

- Zona de resultados (oculta hasta calcular):
  - **Grid de 4 métricas** destacadas (tarjetas con color codificado):
    - ADT Total del Sistema (m) — azul
    - NPSHd Disponible (m) — rojo/naranja/verde según valor
    - Caudal de Diseño (m³/h) — naranja
    - Pvapor Antoine (Pa) — azul
  - Caja de alerta de cavitación (si aplica)
  - **Tabla resumen por tramo** con columnas:
    - Tramo | Descripción | V (m/s) | Re | Régimen (badge) | f | hf (m) | hs (m) | ΔP_sep (m) | ADT_p (m)
    - Fila TOTAL al final con sumas

### 7.3 Pestaña 2 — Gráficas

Grid 2×2 de tarjetas Plotly:

1. **ADT vs. Q** (columna izquierda):
   - Línea azul con área rellena (fill to zero)
   - Punto de diseño: estrella naranja
   - Ejes: Q (m³/h) y ADT (m); hover unificado

2. **NPSHd vs. Q** (columna derecha):
   - Línea verde
   - Línea horizontal roja en y=0 para marcar umbral
   - Punto de diseño: estrella naranja

3. **Pérdidas por Tramo** (fila inferior, ancho completo):
   - Barras apiladas por tramo
   - 4 series: Δz positivo (azul claro) | hf fricción (azul oscuro) | hs menores (naranja) | ΔP_sep (púrpura)

### 7.4 Pestaña 3 — Selección de Bomba

Layout: panel izquierdo 260 px + gráfica a la derecha.

**Panel:**
- Botones de fabricante (tipo "pills/chips"): Grundfos, Pedrollo (solo uno activo a la vez)
- Select de modelo de la marca activa
- Botón "+ Agregar al gráfico"
- Botón "Limpiar modelos"
- Tabla comparativa (visible solo si hay bombas):
  - Modelo | Q_op (m³/h) | H_op (m) | ΔQ (%)
  - ΔQ resaltado si > ±15%
- Nota de advertencia: curvas son representativas

**Gráfica (Plotly):**
- Curva del sistema (azul, rellena)
- Estrella del punto de diseño
- Curva H-Q de cada bomba agregada (colores distintos)
- Punto de operación de cada bomba (círculo con borde blanco)
- Leyenda detallada

### 7.5 Pestaña 4 — Tablas de Datos

Listado vertical de 4 tarjetas editables:

**Cada tarjeta tiene:**
- Header con título
- Botones: "+ Agregar fila" | "⬇ Exportar .xlsx" | "⬆ Importar .xlsx"
- Tabla con celdas inline editables (inputs dentro de `<td>`)
- Columna de borrado (botón × por fila)

**Tablas:**
1. **Fluidos** — cols: Nombre | Concentración (%) | Temp (°C) | Densidad (kg/L) | Viscosidad (cP)
2. **Materiales** — cols: Nombre | Rugosidad (mm)
3. **Diámetros** — cols: Nominal | Interno (pulg.) | Interno (mm)
4. **Coeficientes K** — cols: Tipo de accesorio | K

### 7.6 Pestaña 5 — Exportar

Formulario centrado (max-width 580 px):
- Nombre del proyecto (texto)
- Descripción de la bomba (texto)
- Tag de equipo (texto)
- Versión (texto, defecto "1.0") + Ingeniero (texto) — en la misma fila
- Zona de alertas de estado
- Botón "📄 Descargar PDF" (rojo)
- Botón "📊 Descargar Excel" (verde)
- Mensajes de estado: cargando / éxito / error

### 7.7 Pestaña 6 — Configuración

Formulario centrado (max-width 520 px):
- Fieldset "Presión Atmosférica": valor numérico + selector (Pa, bar, atm)
- Fieldset "Presión de Vapor": input manual + selector (Pa, bar); texto de ayuda "Dejar en blanco para Antoine automático"
- Fieldset "Aceleración Gravitacional": valor numérico en m/s²
- Botón "💾 Guardar configuración"
- Zona de alerta de confirmación

---

## 8. ESPECIFICACIONES DE LA INTERFAZ VISUAL (CSS)

### 8.1 Tokens de diseño (variables CSS)

```css
--azul-oscuro:  #0d47a1
--azul:         #1565c0
--azul-claro:   #1976d2
--azul-fondo:   #e8f0fe
--azul-borde:   #bbdefb
--verde:        #2e7d32
--verde-fondo:  #e8f5e9
--naranja:      #e65100
--naranja-fdo:  #fff3e0
--rojo:         #b71c1c
--rojo-fondo:   #ffebee
--gris-100:     #f5f5f5
--gris-200:     #eeeeee
--gris-300:     #e0e0e0
--gris-400:     #bdbdbd
--gris-600:     #757575
--gris-800:     #424242
--gris-900:     #212121
--blanco:       #ffffff
--radio:        6px
--sombra:       0 2px 8px rgba(0,0,0,0.12)
--sombra-sm:    0 1px 3px rgba(0,0,0,0.08)
--ancho-sidebar: 280px
--alto-header:   54px
--font:          'Segoe UI', system-ui, sans-serif
```

### 8.2 Componentes visuales clave

**Header:** fondo `--azul-oscuro`, sticky, 54 px de altura, sombra inferior, texto blanco.

**Nav de pestañas:** fondo `--azul`, sticky (debajo del header), overflow-x auto, sin scrollbar visible.
Pestaña activa: `border-bottom: 3px solid white; font-weight: 600`.

**Sidebar:** fondo blanco, `border-right`, overflow-y auto, padding 16 px.

**Cards:** fondo blanco, borde `--gris-300`, border-radius 6 px, sombra ligera.
Card-header: fondo `--azul-fondo`, borde inferior `--azul-borde`, texto `--azul-oscuro`.

**Tramo panel:** `<details>` con `<summary>` personalizado (ocultar marcador nativo,
agregar chevron rotable `▶ → 90°` al abrir). Fondo del summary: `--azul-fondo`.
Cuerpo: grid 2 columnas.

**Campos de formulario:** inputs y selects con borde `--gris-300`, focus outline eliminado,
reemplazado por `box-shadow: 0 0 0 2px rgba(21,101,192,0.15)` y `border-color: --azul-claro`.
`campo-con-unidad`: grid `1fr 90px`.

**Métricas:** 4 columnas `auto-fit minmax(180px,1fr)`, `border-left: 4px solid <color>`.
Valor en `font-size: 1.5rem; font-weight: 700`.

**Tablas:**
- `thead`: fondo `--azul-oscuro`, texto blanco
- Filas pares: `--gris-100`; hover: `--azul-fondo`
- `td.num`: `text-align: right; font-variant-numeric: tabular-nums`
- `td.dest`: texto azul, negrita
- `.fila-total`: fondo `--azul-fondo`, negrita

**Badges de régimen:**
- Laminar: fondo `#e3f2fd`, texto `#0d47a1` (azul)
- Turbulento: fondo `#fff3e0`, texto `#e65100` (naranja)
- Transición: fondo `#f3e5f5`, texto `#6a1b9a` (púrpura)

**Alertas:**
- Error: borde+texto `--rojo`, fondo `--rojo-fondo`
- Aviso: borde+texto `--naranja`, fondo `--naranja-fdo`
- OK: borde+texto `--verde`, fondo `--verde-fondo`

**Botones:**
- Base: `border-radius: 4px; transition: filter 0.15s; hover: brightness(0.93); active: scale(0.97)`
- `btn-primario`: azul
- `btn-secundario`: gris claro
- `btn-verde`, `btn-naranja`, `btn-rojo`: colores respectivos
- `btn-calcular`: `--azul-oscuro`, font-size 0.95rem, bold, padding 10px 28px
- `btn-marca`: pill (border-radius 16px); activa = azul

**Scrollbar personalizado:** width 6px, thumb `--gris-400`.

### 8.3 Responsive

**≤ 900 px:**
- `.layout-calc`: columna (sidebar arriba, max-height 50vh)
- `.graficas-grid`: 1 columna
- `.bombas-layout`: 1 columna
- `.tramo-cuerpo`: 1 columna

**≤ 600 px:**
- Pestañas: padding reducido, font-size 0.72rem
- Header: font-size 0.85rem
- Métricas: 2 columnas
- Formularios: padding 16px

---

## 9. EXPORTACIÓN PDF — ESPECIFICACIONES

Usando jsPDF, formato A4 portrait (210 × 297 mm), márgenes 15 mm.

**Paleta de colores PDF:**
- Azul: `[13, 71, 161]`
- Gris: `[97, 97, 97]`
- Negro: `[33, 33, 33]`
- Fondo azul claro: `[232, 240, 254]`

**Secciones del documento (en orden):**

1. **Portada** — fondo azul completo (0,0,210,50), textos blancos centrados:
   - Título 18pt: "MEMORIA DE CÁLCULO HIDRÁULICO"
   - Subtítulo 11pt: "Sistema de Bombeo Centrífugo"
   - Fecha/hora de generación 9pt

2. **Datos del Proyecto** — filas `label: valor [unidad]`:
   - Proyecto, Descripción de bomba, Tag, Versión, Ingeniero

3. **Datos de Entrada:**
   - Parámetros globales: Q, Q_min, Q_max, fluido, temperatura, n_tramos
   - Propiedades del fluido: ρ, μ (cP), Pvapor, Patm, g
   - Por tramo: longitud, Δz, diámetro, material, accesorios

4. **Ecuaciones Aplicadas** — tabla de 10 ecuaciones:

   | Nombre | Ecuación |
   |--------|----------|
   | Área sección | A = π · D_int² / 4 |
   | Velocidad | V = Q / A |
   | Reynolds | Re = (ρ · V · D_int) / μ |
   | Laminar (Re<2300) | f = 64 / Re |
   | Turbulento | 1/√f = −2·log₁₀(ε/(3.7D) + 2.51/(Re·√f)) |
   | Darcy-Weisbach | hf = f · (L/D) · V²/(2g) |
   | Pérd. menores | hs = K_total · V²/(2g) |
   | ADT tramo | ADT_tramo = Δz + hf + hs + ΔP_sep/(ρg) |
   | NPSHd | NPSHd = (Patm−Pvapor)/(ρg) + Δz_suc − hf_suc − hs_suc |
   | Antoine | log₁₀(P_mmHg) = 8.07131 − 1730.63/(233.426+T) |

5. **Desarrollo del Cálculo** — por cada tramo: D, L, Δz, V, Re, régimen, f, hf, K_total, hs, ΔP_sep, ADT_p

6. **Tabla Resumen** — encabezados con fondo azul claro, 7 columnas:
   Tramo | V (m/s) | Re | Régimen | hf (m) | hs (m) | ADT_p (m)

7. **Gráficas** (PNG embebidas vía `Plotly.toImage()`):
   - Curva ADT vs. Q
   - NPSHd vs. Q
   - Pérdidas por Tramo (barras)

8. **Conclusiones:**
   - Caja destacada: ADT TOTAL (fondo azul claro, valor grande)
   - Caja destacada: NPSHd calculado
   - Bullet por tramo: régimen + Re
   - Advertencia en rojo si NPSHd < 0

9. **Footer (todas las páginas):** "Página X de Y" (derecha) + nombre del proyecto (izquierda)

**Verificación de salto de página:** función `checkPage(altura_necesaria)` que agrega nueva
página si el cursor Y excede `PAGE_H - MARGIN`.

**Nombre de archivo:** `memoria_hidraulica_<tag>.pdf`

---

## 10. EXPORTACIÓN EXCEL — ESPECIFICACIONES

Usando SheetJS. Libro con **4 hojas**:

**Hoja 1 — "Datos de Entrada":**
Columnas: `[Parámetro, Valor, Unidad, Descripción]`
- Parámetros globales (Q, Q_min, Q_max, fluido, temperatura, n_tramos, info proyecto)
- Bloque TRAMOS: por cada tramo: descripción, L, Δz, diámetro, material, accesorios
- Anchos: [35, 20, 12, 40] caracteres

**Hoja 2 — "Resultados por Tramo":**
Columnas: `[Tramo, Descripción, V (m/s), Re, Régimen, hf (m), hs (m), ΔP_sep (m), ADT_parcial (m)]`
- Una fila por tramo + fila TOTAL (con sumas)
- Anchos: [8, 18, 12, 14, 14, 12, 12, 14, 18]

**Hoja 3 — "Análisis de Rango":**
Columnas: `[Q (m³/h), ADT (m), NPSHd (m), V_media (m/s)]`
- 7 filas (puntos del rango)

**Hoja 4 — "Propiedades del Sistema":**
- Nombre del fluido, concentración, ρ (kg/m³), μ (cP), μ (Pa·s), temperatura
- Pvapor (Pa), Patm (Pa), g (m/s²)
- Bloque RESULTADOS GLOBALES: ADT total, NPSHd, Q diseño

**Nombre de archivo:** `calculo_hidraulico_<tag>.xlsx`

---

## 11. FLUJO PRINCIPAL DE LA APLICACIÓN

```
1. Cargar página
   ├─ cargarDesdeLocalStorage()  → restaura STATE y CONFIG
   ├─ cargarEstadoAlDOM()        → llena inputs del sidebar
   ├─ renderTramos()             → genera paneles de tramos
   ├─ poblarSelectFluido()       → llena el selector
   ├─ initTabs()                 → bind de eventos en pestañas
   ├─ initBombas()               → botones de marcas + modelos
   └─ calcular() automático     → muestra resultados iniciales si es posible

2. Cambiar parámetros → usuario edita campos

3. Pulsar CALCULAR
   ├─ leerEstadoDesdeDOM()   → extrae todos los valores del DOM a STATE
   ├─ guardarEnLocalStorage() → persiste
   ├─ calcular()              → motor de cálculo → actualiza STATE.resultados
   ├─ mostrarResultados()     → actualiza métricas y tabla
   └─ actualizarGraficas()   → re-renderiza Plotly

4. Cambiar pestaña → según target:
   - "tab-graficas" → actualizarGraficas()
   - "tab-bombas"   → actualizarGraficaBombas()
   - "tab-tablas"   → renderTablasEdicion()
   - "tab-config"   → cargarFormConfig()

5. Exportar
   ├─ PDF → generarPDF(infoProyecto)  [async]
   └─ Excel → generarExcel(infoProyecto)
```

---

## 12. FORMATEO DE NÚMEROS

Se usa la localización `es-PE` (Peru) para el separador decimal (punto) y miles (coma),
o adaptarla al idioma objetivo:

```javascript
fmt(val, decimals) → Number(val).toLocaleString('es-PE', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
})
```

Funciones auxiliares: `fmt2()` (2 decimales), `fmt0()` (0 decimales), `fmt(v, 3)` (3 decimales por defecto).
Si el valor es `null`, `undefined` o `NaN`, retornar `'—'`.

---

## 13. ESTÁNDARES Y REFERENCIAS TÉCNICAS

| Referencia | Descripción |
|------------|-------------|
| **Ecuación de Darcy-Weisbach** | Pérdida de carga por fricción en tuberías. Estándar en ingeniería hidráulica. |
| **Correlación de Colebrook-White (1939)** | Factor de fricción en flujo turbulento. Ecuación implícita, solución iterativa. |
| **Ley de Hagen-Poiseuille (1839/1840)** | Factor de fricción en flujo laminar: f = 64/Re. |
| **Ecuación de Antoine** | Correlación empírica para presión de vapor de líquidos. Constantes para agua. |
| **Clasificación de Reynolds** | Laminar < 2300; Transición 2300-4000; Turbulento > 4000. |
| **NPSHd / NPSHr** | Concepto de ANSI/HI Hydraulic Institute Standards para bombas centrífugas. |
| **Margen de cavitación** | Práctica común: mantener NPSHd ≥ NPSHr + 0.5 a 1 m como mínimo; alerta < 3 m. |
| **Rugosidades de materiales** | Valores típicos de tablas de ingeniería (Moody, Crane TP-410, etc.). |
| **Diámetros NPS** | ASME B36.10M / ASME B36.19M; cédula 40 (Schedule 40) para PVC/acero. |
| **Diámetros DN** | ISO 4200; tuberías termoplásticas SDR. |

---

## 14. LIMITACIONES CONOCIDAS DEL PROGRAMA

1. La presión de vapor usa la ecuación de Antoine **para agua**. Para otros fluidos, el usuario debe ingresar Pvapor manualmente.
2. El NPSHd se calcula solo con el tramo 0 (succión). Tramos adicionales no influyen en el NPSHd.
3. Las curvas H-Q de bombas son aproximaciones representativas; no sustituyen al catálogo oficial.
4. La aplicación es 100% cliente; no hay autenticación, base de datos ni sincronización entre dispositivos.
5. Los datos del localStorage son específicos del navegador/perfil del usuario.
6. El modelo de reducción brusca usa la fórmula simplificada `K = (1 − β²)²`; no distingue entre contracción y expansión brusca.

---

## 15. ARRANQUE / DEPLOY

Servidor mínimo para desarrollo:
```bash
python -m http.server 8765
# Acceder a http://localhost:8765
```

No requiere compilación ni bundler. El único requisito es acceso a los CDN:
- `cdn.plot.ly`
- `cdnjs.cloudflare.com`
- `cdn.sheetjs.com`

Para uso offline, descargar las 3 librerías y referenciarlas localmente.

---

*Fin del prompt técnico. Con esta especificación es posible recrear el programa completo
en cualquier tecnología (React, Vue, Python/Flask, Electron, app móvil, etc.) manteniendo
idéntica lógica de cálculo, tablas de datos, flujo de interfaz y funcionalidad de exportación.*
