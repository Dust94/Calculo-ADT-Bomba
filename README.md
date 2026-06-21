# Calculadora Hidráulica de Sistemas de Bombeo

Aplicación web para el dimensionamiento y análisis hidráulico de sistemas de bombeo centrífugo. Calcula la **Altura Dinámica Total (ADT)**, el **NPSH disponible (NPSHd)**, genera curvas del sistema, compara bombas comerciales y exporta memorias de cálculo en PDF y Excel.

> **Repositorio:** [github.com/Dust94/Calculo-ADT-Bomba](https://github.com/Dust94/Calculo-ADT-Bomba)

---

## Características

| Módulo | Descripción |
|--------|-------------|
| **Cálculo** | Sistemas de 2 a 5 tramos con pérdidas por fricción, accesorios, reducciones bruscas y elementos separadores |
| **Gráficas** | Curvas ADT vs. Q, NPSHd vs. Q y desglose de pérdidas por tramo (Plotly.js) |
| **Selección de bomba** | Superposición de curvas H–Q de bombas comerciales (Grundfos, Pedrollo) sobre la curva del sistema |
| **Tablas de datos** | Fluidos, materiales, diámetros y coeficientes K editables; importación/exportación `.xlsx` |
| **Exportar** | Memoria de cálculo en PDF (jsPDF) y Excel (SheetJS) |
| **Configuración** | Presión atmosférica, presión de vapor (Antoine o manual) y gravedad |

---

## Requisitos

- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Conexión a Internet **solo** para cargar las librerías CDN (Plotly, jsPDF, SheetJS)

No requiere instalación de Node.js, Python ni servidor backend.

---

## Inicio rápido

1. Clonar o descargar el repositorio.
2. Abrir `index.html` en el navegador (doble clic o arrastrar al navegador).
3. Ajustar parámetros en la pestaña **Cálculo** y pulsar **CALCULAR**.

Alternativa con servidor local (opcional, evita restricciones de algunos navegadores):

```powershell
# Desde la carpeta del proyecto
python -m http.server 8080
# Abrir http://localhost:8080
```

---

## Estructura del proyecto

```
Programa ADT Bomba/
├── index.html      # Interfaz principal, lógica de UI y pestañas
├── calculos.js     # Motor hidráulico (Darcy-Weisbach, Colebrook-White, NPSHd)
├── datos.js        # Tablas por defecto, estado global, unidades y localStorage
├── reportes.js     # Generación de PDF y Excel
├── estilos.css     # Estilos de la aplicación
└── README.md
```

---

## Guía de uso

### 1. Cálculo

- **Parámetros globales:** caudal de diseño (m³/h, L/s o GPM), rango Q mín/máx, fluido, temperatura y número de tramos.
- **Por tramo:** descripción, longitud, Δz (altura estática), diámetro nominal, material, accesorios locales, reducción brusca opcional y caída de presión de separadores/filtros.
- **Resultados:** ADT total, NPSHd, tabla detallada por tramo (velocidad, Re, régimen, factor *f*, *hf*, *hs*, ΔP separador).

### 2. Gráficas

Se actualizan automáticamente tras calcular. Muestran el punto de diseño y el comportamiento del sistema en el rango de caudales definido.

### 3. Selección de bomba

1. Ejecutar el cálculo del sistema.
2. Elegir fabricante y modelo.
3. **Agregar al gráfico** para superponer la curva H–Q.
4. Revisar el punto de operación estimado y la tabla comparativa (ΔQ respecto al caudal de diseño).

> Las curvas de bombas son **representativas**. Validar siempre con el catálogo oficial del fabricante.

### 4. Tablas de datos

Editar fluidos (densidad, viscosidad), materiales (rugosidad), diámetros NPS/DN y coeficientes K. Los cambios se guardan en el navegador. Se pueden exportar e importar tablas individuales en Excel.

### 5. Exportar

Completar datos del proyecto (nombre, tag, ingeniero, etc.) y descargar la memoria en PDF o Excel. Es necesario haber calculado el sistema previamente.

### 6. Configuración

Ajustar `Patm`, `Pvapor` (automático por ecuación de Antoine para agua, o valor manual) y `g`. Los valores se persisten en `localStorage`.

---

## Metodología de cálculo

### Pérdidas por tramo

- **Fricción (Darcy-Weisbach):** `hf = f · (L/D) · V²/(2g)`
- **Factor de fricción:** laminar (`f = 64/Re`), turbulento (Colebrook-White iterativo), transición (2300 < Re < 4000) por interpolación lineal.
- **Pérdidas menores:** `hs = Σ(K) · V²/(2g)` (accesorios y reducciones bruscas).
- **Separadores:** conversión de ΔP a metros de columna de fluido.
- **ADT por tramo:** `Δz + hf + hs + ΔP_sep`

### NPSH disponible

Calculado sobre el **tramo de succión** (tramo 1):

```
NPSHd = (Patm − Pvapor) / (ρ·g) + Δz_succión − hf_succión − hs_succión
```

Se alerta si NPSHd < 0 (riesgo de cavitación) o NPSHd < 3 m (margen reducido).

### Análisis de rango

Genera 7 puntos equiespaciados entre Q mínimo y Q máximo para las curvas ADT–Q y NPSHd–Q.

---

## Fluidos precargados

Incluye agua, soluciones de NaOH y H₂SO₄ en distintas concentraciones, floculantes, lodos TSS y más. Las propiedades (densidad en kg/L, viscosidad en cP) son editables en la pestaña **Tablas de Datos**.

---

## Dependencias (CDN)

| Librería | Uso |
|----------|-----|
| [Plotly.js 2.32](https://plotly.com/javascript/) | Gráficos interactivos |
| [jsPDF 2.5](https://github.com/parallax/jsPDF) | Exportación PDF |
| [SheetJS 0.20](https://sheetjs.com/) | Exportación/importación Excel |

---

## Persistencia de datos

El estado del proyecto (parámetros, tramos, tablas editadas y configuración) se guarda automáticamente en **`localStorage`** del navegador bajo las claves `hidraulica_state` e `hidraulica_config`. Los datos no se sincronizan entre dispositivos ni se envían a ningún servidor.

---

## Limitaciones

- Aplicación **100 % cliente**: no hay base de datos ni autenticación.
- La presión de vapor por defecto usa la ecuación de **Antoine para agua**; para otros fluidos conviene verificar o ingresar Pvapor manualmente.
- Las curvas de bombas comerciales son aproximaciones para comparación preliminar.
- El NPSHd no incluye pérdidas en el lado de succión más allá del tramo 1 modelado (p. ej. línea de aspiración no declarada).

---

## Licencia

Consultar al autor del repositorio para condiciones de uso y distribución.
