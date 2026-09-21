# Calendario Semanal "Bento Flotante" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, no-login weekly calendar (Mon–Sun, one column per day) where notes float freely inside each day (not a lined list), can be dragged, pinned, marked completed, and are synced in real time via Firestore so multiple people with the link see the same board.

**Architecture:** Plain HTML/CSS/JS (ES modules, no build step, no framework) organized as small single-responsibility files. Pure logic (dates, in-memory note store) is unit-testable with Node's built-in `assert`; DOM/interaction work is verified manually in the browser. The note-store module has one fixed interface (`subscribe/addNote/updateNote/removeNote/restoreNote/getNotesForDay/getAllNotes`) implemented first in-memory (Task 3) and later swapped for a Firestore-backed implementation (Task 9) without touching any rendering/interaction code.

**Tech Stack:** Vanilla JS (ES modules), CSS, Firebase Firestore (client SDK via CDN, no auth), GitHub Pages for hosting. Node.js only used to run the two pure-logic test files (not shipped to the browser).

## Global Constraints

- No build tooling, no npm packages, no framework — plain files served as-is by GitHub Pages.
- Project root is `calendario-semanal/` (already an initialized separate git repo, independent from any other project).
- Note type enum is fixed: `tarea`, `nota`, `pendiente`, `actividad` (from the spec's "Tipos fijos predefinidos").
- **Naming disambiguation (spec ambiguity resolved here):** the type value `pendiente` (one of the four categories) is a different concept from a note's completion state. Completion state is modeled as `completada: boolean`; the not-yet-completed state is called `activa` in code/CSS (never `pendiente`) specifically to avoid colliding with the `tipo: 'pendiente'` value.
- Firebase's client-side config object (`apiKey`, `authDomain`, etc.) is **not a secret** — it's meant to be public in client code; Firebase access control is enforced by Firestore Security Rules, not by hiding the config. This does not violate the project's "never hardcode credentials" rule, which is about real secrets (passwords, service-account keys) — none of those are ever used here since everything runs client-side.
- Firestore rules are intentionally open (`allow read, write: if true`) — no login, per the approved design. This is a deliberate, documented trade-off, mitigated by the 5-second "undo" on delete.
- Visual spec to match exactly: dark background, rounded gradient cards per type, notes positioned freely (absolute position) inside their day column, gold ring + ⭐ for pinned, colored glow for not-completed (`activa`), dimmed + big green ✔ for completed, glow and gold ring combine (never replace each other).
- Pure-logic modules (`dateUtils.js`, `noteStore.js`) get real Node-run tests (`node <file>.test.mjs`, using `node:assert/strict`, no dependencies). DOM/interaction modules are verified manually in the browser per the spec's testing section (no automated UI test framework).

---

## File Structure

```
calendario-semanal/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── dateUtils.js
│   ├── dateUtils.test.mjs
│   ├── noteStore.js
│   ├── noteStore.test.mjs
│   ├── render.js
│   ├── dragDrop.js
│   ├── modal.js
│   ├── toast.js
│   ├── app.js
│   ├── firebaseConfig.js       (Task 9)
│   └── firestoreStore.js       (Task 9)
└── docs/superpowers/{specs,plans}/  (already exist)
```

---

### Task 1: Static shell + visual style baseline

**Files:**
- Create: `index.html`
- Create: `css/styles.css`

**Interfaces:**
- Produces: the CSS class names every later task relies on: `.nota`, `.nota-tarea`, `.nota-nota`, `.nota-pendiente`, `.nota-actividad`, `.tamano-chico`, `.tamano-mediano`, `.tamano-grande`, `.activa`, `.completada`, `.fijada`, `.dia-columna`, `.dia-etiqueta`, `.dia-hoy`, `.dia-agregar`, `.dia-vacio`, `.pin-badge`, `.nota-check`, `.nota-titulo`.
- Produces: element ids every later task relies on: `#semana`, `#rango-semana`, `#semana-anterior`, `#semana-siguiente`, `#semana-hoy`.

- [ ] **Step 1: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calendario Semanal</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <header class="barra-superior">
    <button id="semana-anterior" class="nav-boton" type="button">◀</button>
    <span id="rango-semana" class="rango-semana"></span>
    <button id="semana-siguiente" class="nav-boton" type="button">▶</button>
    <button id="semana-hoy" class="nav-boton nav-hoy" type="button">Hoy</button>
  </header>

  <main id="semana" class="semana">
    <div class="dia-columna" data-dia="MUESTRA">
      <span class="dia-etiqueta dia-hoy">LUN 21</span>
      <button class="dia-agregar" type="button">+</button>

      <div class="nota nota-tarea tamano-mediano activa" style="left:14px;top:34px;">
        <div class="nota-titulo">Llamar proveedor</div>
      </div>

      <div class="nota nota-nota tamano-grande fijada" style="left:44px;top:104px;">
        <div class="nota-titulo">Reunión con equipo 10am</div>
        <span class="pin-badge">⭐</span>
      </div>

      <div class="nota nota-actividad tamano-chico completada" style="left:20px;top:220px;">
        <div class="nota-titulo">Pagar renta</div>
        <span class="nota-check">✔</span>
      </div>
    </div>
  </main>
</body>
</html>
```

- [ ] **Step 2: Write `css/styles.css`**

```css
:root {
  color-scheme: dark;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
  background: #05060a;
  color: #e5e7eb;
}

.barra-superior {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: #0b0d12;
}

.nav-boton {
  background: #1a1d26;
  color: #e5e7eb;
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 14px;
  cursor: pointer;
}

.nav-hoy { margin-left: auto; background: #374151; }

.rango-semana {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: .02em;
}

.semana {
  display: flex;
  gap: 14px;
  padding: 16px;
  overflow-x: auto;
}

.dia-columna {
  position: relative;
  flex: 1;
  min-width: 160px;
  min-height: 420px;
  background: #0b0d12;
  border-radius: 16px;
  padding-top: 34px;
}

.dia-etiqueta {
  position: absolute;
  top: 10px;
  left: 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  opacity: .55;
}

.dia-etiqueta.dia-hoy { opacity: 1; color: #facc15; }

.dia-agregar {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: #1f2330;
  color: #e5e7eb;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.dia-vacio {
  position: absolute;
  top: 60px;
  left: 14px;
  right: 14px;
  font-size: 12px;
  opacity: .4;
  text-align: center;
}

.nota {
  position: absolute;
  border-radius: 16px;
  padding: 9px 10px;
  font-size: 11px;
  line-height: 1.35;
  color: #fff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, .45);
  cursor: grab;
  user-select: none;
}

.tamano-chico   { width: 90px;  height: 70px;  }
.tamano-mediano { width: 115px; height: 95px;  }
.tamano-grande  { width: 140px; height: 120px; }

.nota-tarea      { background: linear-gradient(160deg, #7c3aed, #a78bfa); }
.nota-nota       { background: linear-gradient(160deg, #0891b2, #67e8f9); color: #04252b; }
.nota-pendiente  { background: linear-gradient(160deg, #db2777, #f9a8d4); color: #3b0a24; }
.nota-actividad  { background: linear-gradient(160deg, #22c55e, #bbf7d0); color: #052e14; }

.nota.activa.nota-tarea     { box-shadow: 0 0 0 2px rgba(167,139,250,.5), 0 0 26px 6px rgba(124,58,237,.65), 0 6px 16px rgba(0,0,0,.45); }
.nota.activa.nota-nota      { box-shadow: 0 0 0 2px rgba(103,232,249,.5), 0 0 26px 6px rgba(8,145,178,.65), 0 6px 16px rgba(0,0,0,.45); }
.nota.activa.nota-pendiente { box-shadow: 0 0 0 2px rgba(249,168,212,.5), 0 0 26px 6px rgba(219,39,119,.65), 0 6px 16px rgba(0,0,0,.45); }
.nota.activa.nota-actividad { box-shadow: 0 0 0 2px rgba(187,247,208,.5), 0 0 26px 6px rgba(34,197,94,.65), 0 6px 16px rgba(0,0,0,.45); }

.nota.completada {
  filter: brightness(.45) saturate(.7);
}

.nota-check {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #22c55e;
  text-shadow: 0 0 14px rgba(34,197,94,.9), 0 0 4px #000;
  pointer-events: none;
}

.nota.fijada::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 20px;
  border: 3px solid #facc15;
  box-shadow: 0 0 16px 2px rgba(250,204,21,.7);
  pointer-events: none;
}

.pin-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 10px;
}

.nota-titulo {
  font-weight: 600;
}
```

- [ ] **Step 3: Open `index.html` directly in a browser and visually confirm:**
  - Dark background, one day column with 3 notes.
  - Purple note glows purple (not completed / "activa").
  - Cyan note has a gold ring + ⭐ (pinned) — no purple/cyan glow needed here since it's not marked activa in this static sample.
  - Green note is dimmed with a big glowing green ✔ centered on it (completed).

- [ ] **Step 4: Commit**

```bash
cd calendario-semanal
git add index.html css/styles.css
git commit -m "Añadir estructura estática y estilo visual bento flotante"
```

---

### Task 2: Date/week utilities

**Files:**
- Create: `js/dateUtils.js`
- Test: `js/dateUtils.test.mjs`

**Interfaces:**
- Produces: `toISODate(date): string`, `getWeekStart(date): Date`, `getWeekDates(weekStart): string[7]`, `addWeeks(date, n): Date`, `formatDayLabel(isoDate): string`, `formatWeekRange(weekDates): string`, `isToday(isoDate): boolean`.

- [ ] **Step 1: Write the failing test**

```js
// js/dateUtils.test.mjs
import assert from 'node:assert/strict';
import {
  toISODate, getWeekStart, getWeekDates, addWeeks, formatDayLabel, formatWeekRange, isToday,
} from './dateUtils.js';

// getWeekStart always lands on a Monday, for any day of the week
for (let offset = 0; offset < 14; offset += 1) {
  const probe = new Date(2026, 0, 1 + offset);
  const start = getWeekStart(probe);
  assert.equal(start.getDay(), 1, `offset ${offset} should resolve to Monday`);
}

// getWeekDates returns 7 consecutive ISO dates starting at weekStart
const start = getWeekStart(new Date(2026, 5, 15));
const week = getWeekDates(start);
assert.equal(week.length, 7);
assert.equal(week[0], toISODate(start));
for (let i = 1; i < 7; i += 1) {
  const prev = new Date(week[i - 1]);
  const curr = new Date(week[i]);
  assert.equal((curr - prev) / (1000 * 60 * 60 * 24), 1, `day ${i} should be 1 day after day ${i - 1}`);
}

// addWeeks(date, 1) is exactly 7 days later
const base = new Date(2026, 2, 10);
const oneWeekLater = addWeeks(base, 1);
assert.equal((oneWeekLater - base) / (1000 * 60 * 60 * 24), 7);

// formatDayLabel returns a 3-letter code + day number
assert.match(formatDayLabel('2026-06-15'), /^[A-ZÁÉÍÓÚ]{3} \d{1,2}$/);

// formatWeekRange returns a human range string
assert.match(formatWeekRange(week), /^\d{1,2}–\d{1,2} [a-z]{3} \d{4}$/);

// isToday is true for today's own ISO date
assert.equal(isToday(toISODate(new Date())), true);
assert.equal(isToday('2000-01-01'), false);

console.log('dateUtils.test.mjs: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node js/dateUtils.test.mjs`
Expected: `Error [ERR_MODULE_NOT_FOUND]` (dateUtils.js doesn't exist yet)

- [ ] **Step 3: Write `js/dateUtils.js`**

```js
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDates(weekStart) {
  const dates = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    dates.push(toISODate(d));
  }
  return dates;
}

export function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

const DIA_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const MES_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatDayLabel(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayIndex = (date.getDay() + 6) % 7; // convert Sun=0 based to Mon=0 based
  return `${DIA_LABELS[dayIndex]} ${d}`;
}

export function formatWeekRange(weekDates) {
  const first = weekDates[0].split('-').map(Number);
  const last = weekDates[6].split('-').map(Number);
  const month = MES_LABELS[last[1] - 1];
  return `${first[2]}–${last[2]} ${month} ${last[0]}`;
}

export function isToday(isoDate) {
  return isoDate === toISODate(new Date());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node js/dateUtils.test.mjs`
Expected: `dateUtils.test.mjs: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add js/dateUtils.js js/dateUtils.test.mjs
git commit -m "Añadir utilidades de fecha/semana con pruebas"
```

---

### Task 3: In-memory note store

**Files:**
- Create: `js/noteStore.js`
- Test: `js/noteStore.test.mjs`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces (the fixed store interface every later task uses): `subscribe(listener): unsubscribeFn`, `addNote(partial): nota`, `updateNote(id, patch): nota|null`, `removeNote(id): nota|null`, `restoreNote(nota): nota`, `getNotesForDay(dia): nota[]`, `getAllNotes(): nota[]`, `resetStore(): void`.
- Nota shape: `{ id, dia, tipo, titulo, descripcion, color, posicionX, posicionY, tamano, fijada, completada, creadoEn }`.

- [ ] **Step 1: Write the failing test**

```js
// js/noteStore.test.mjs
import assert from 'node:assert/strict';
import * as store from './noteStore.js';

store.resetStore();

// addNote fills defaults and notifies subscribers
let received = null;
const unsubscribe = store.subscribe((notes) => { received = notes; });
const nota = store.addNote({ dia: '2026-06-15', tipo: 'tarea', titulo: 'Probar' });
assert.equal(nota.tipo, 'tarea');
assert.equal(nota.completada, false);
assert.equal(nota.fijada, false);
assert.equal(nota.tamano, 'mediano');
assert.equal(received.length, 1);

// updateNote merges fields
store.updateNote(nota.id, { completada: true });
assert.equal(store.getAllNotes()[0].completada, true);

// getNotesForDay filters by day
store.addNote({ dia: '2026-06-16', tipo: 'nota', titulo: 'Otro día' });
assert.equal(store.getNotesForDay('2026-06-15').length, 1);
assert.equal(store.getNotesForDay('2026-06-16').length, 1);

// removeNote removes and returns the removed note; restoreNote brings it back
const eliminada = store.removeNote(nota.id);
assert.equal(eliminada.id, nota.id);
assert.equal(store.getAllNotes().length, 1);
store.restoreNote(eliminada);
assert.equal(store.getAllNotes().length, 2);

unsubscribe();
store.resetStore();
assert.equal(store.getAllNotes().length, 0);

console.log('noteStore.test.mjs: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node js/noteStore.test.mjs`
Expected: `Error [ERR_MODULE_NOT_FOUND]` (noteStore.js doesn't exist yet)

- [ ] **Step 3: Write `js/noteStore.js`**

```js
let notes = [];
let idCounter = 0;
const listeners = new Set();

function generateId() {
  idCounter += 1;
  return `local-${Date.now()}-${idCounter}`;
}

function notify() {
  for (const listener of listeners) listener(notes.slice());
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(notes.slice());
  return () => listeners.delete(listener);
}

export function addNote(partial) {
  const nota = {
    id: partial.id || generateId(),
    dia: partial.dia,
    tipo: partial.tipo,
    titulo: partial.titulo || '',
    descripcion: partial.descripcion || '',
    color: partial.color || partial.tipo,
    posicionX: partial.posicionX ?? 20,
    posicionY: partial.posicionY ?? 40,
    tamano: partial.tamano || 'mediano',
    fijada: partial.fijada ?? false,
    completada: partial.completada ?? false,
    creadoEn: partial.creadoEn ?? Date.now(),
  };
  notes.push(nota);
  notify();
  return nota;
}

export function updateNote(id, patch) {
  const nota = notes.find((n) => n.id === id);
  if (!nota) return null;
  Object.assign(nota, patch);
  notify();
  return nota;
}

export function removeNote(id) {
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return null;
  const [removed] = notes.splice(index, 1);
  notify();
  return removed;
}

export function restoreNote(nota) {
  notes.push(nota);
  notify();
  return nota;
}

export function getNotesForDay(dia) {
  return notes.filter((n) => n.dia === dia);
}

export function getAllNotes() {
  return notes.slice();
}

export function resetStore() {
  notes = [];
  notify();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node js/noteStore.test.mjs`
Expected: `noteStore.test.mjs: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add js/noteStore.js js/noteStore.test.mjs
git commit -m "Añadir store de notas en memoria con pruebas"
```

---

### Task 4: Wire real rendering (replace static sample)

**Files:**
- Modify: `index.html` (remove hardcoded sample notes from Task 1 Step 1, add `<script type="module" src="js/app.js">`)
- Create: `js/render.js`
- Create: `js/app.js`

**Interfaces:**
- Consumes: `dateUtils.js` (`getWeekStart`, `getWeekDates`, `addWeeks`, `formatWeekRange`, `isToday`, `formatDayLabel`), `noteStore.js` (full store interface from Task 3).
- Produces: `renderWeek({ container, weekDates, store }): void` (used unchanged in Task 6, 8), `renderNota(nota): HTMLElement`.

- [ ] **Step 1: Replace the `<main id="semana">` block in `index.html`**

```html
  <main id="semana" class="semana"></main>
  <script type="module" src="js/app.js"></script>
```

(Remove the old hardcoded `.dia-columna` sample block from Task 1 entirely — `render.js` now builds it.)

- [ ] **Step 2: Write `js/render.js`**

```js
import { formatDayLabel, isToday } from './dateUtils.js';

export function renderWeek({ container, weekDates, store }) {
  container.innerHTML = '';
  for (const dia of weekDates) {
    const columna = document.createElement('div');
    columna.className = 'dia-columna';
    columna.dataset.dia = dia;

    const label = document.createElement('span');
    label.className = 'dia-etiqueta';
    if (isToday(dia)) label.classList.add('dia-hoy');
    label.textContent = formatDayLabel(dia);
    columna.appendChild(label);

    const addBtn = document.createElement('button');
    addBtn.className = 'dia-agregar';
    addBtn.type = 'button';
    addBtn.textContent = '+';
    addBtn.dataset.dia = dia;
    columna.appendChild(addBtn);

    const notasDelDia = store.getNotesForDay(dia);
    if (notasDelDia.length === 0) {
      const vacio = document.createElement('p');
      vacio.className = 'dia-vacio';
      vacio.textContent = 'Sin pendientes';
      columna.appendChild(vacio);
    } else {
      for (const nota of notasDelDia) columna.appendChild(renderNota(nota));
    }

    container.appendChild(columna);
  }
}

export function renderNota(nota) {
  const el = document.createElement('div');
  el.className = `nota nota-${nota.tipo} tamano-${nota.tamano}`;
  if (!nota.completada) el.classList.add('activa');
  if (nota.completada) el.classList.add('completada');
  if (nota.fijada) el.classList.add('fijada');
  el.dataset.id = nota.id;
  el.style.left = `${nota.posicionX}px`;
  el.style.top = `${nota.posicionY}px`;

  const titulo = document.createElement('div');
  titulo.className = 'nota-titulo';
  titulo.textContent = nota.titulo;
  el.appendChild(titulo);

  if (nota.fijada) {
    const pin = document.createElement('span');
    pin.className = 'pin-badge';
    pin.textContent = '⭐';
    el.appendChild(pin);
  }

  if (nota.completada) {
    const check = document.createElement('span');
    check.className = 'nota-check';
    check.textContent = '✔';
    el.appendChild(check);
  }

  return el;
}
```

- [ ] **Step 3: Write `js/app.js`**

```js
import { getWeekStart, getWeekDates, addWeeks, formatWeekRange } from './dateUtils.js';
import * as noteStore from './noteStore.js';
import { renderWeek } from './render.js';

const store = noteStore;
let currentWeekStart = getWeekStart(new Date());

const semanaEl = document.getElementById('semana');
const rangoEl = document.getElementById('rango-semana');

function render() {
  const weekDates = getWeekDates(currentWeekStart);
  rangoEl.textContent = formatWeekRange(weekDates);
  renderWeek({ container: semanaEl, weekDates, store });
}

function seedIfEmpty() {
  if (store.getAllNotes().length > 0) return;
  const [lunes, martes] = getWeekDates(currentWeekStart);
  store.addNote({ dia: lunes, tipo: 'tarea', titulo: 'Llamar proveedor', tamano: 'mediano', posicionX: 14, posicionY: 34 });
  store.addNote({ dia: lunes, tipo: 'nota', titulo: 'Revisar correo', tamano: 'mediano', posicionX: 44, posicionY: 104 });
  store.addNote({ dia: martes, tipo: 'actividad', titulo: 'Reunión con equipo 10am', tamano: 'grande', posicionX: 20, posicionY: 36, fijada: true });
}

document.getElementById('semana-anterior').addEventListener('click', () => {
  currentWeekStart = addWeeks(currentWeekStart, -1);
  render();
});
document.getElementById('semana-siguiente').addEventListener('click', () => {
  currentWeekStart = addWeeks(currentWeekStart, 1);
  render();
});
document.getElementById('semana-hoy').addEventListener('click', () => {
  currentWeekStart = getWeekStart(new Date());
  render();
});

seedIfEmpty();
store.subscribe(render);
```

- [ ] **Step 4: Open `index.html` in the browser and confirm manually:**
  - The week bar shows a date range (e.g. "15–21 jun 2026") and today's column label is highlighted gold.
  - The three seeded notes appear in the right columns, with the same visual states as Task 1 (purple glow, pinned gold ring, etc.).
  - Clicking ◀ / ▶ changes the visible week's notes (empty for other weeks, showing "Sin pendientes" in each day). Clicking "Hoy" returns to the current week and the seeded notes reappear.

- [ ] **Step 5: Commit**

```bash
git add index.html js/render.js js/app.js
git commit -m "Renderizar la semana desde el store real en vez de HTML de muestra"
```

---

### Task 5: Note detail modal (edit, complete, delete + undo)

**Files:**
- Modify: `index.html` (add modal markup + toast element)
- Modify: `css/styles.css` (add modal/toast styles)
- Create: `js/modal.js`
- Create: `js/toast.js`
- Modify: `js/app.js` (wire modal open/save/delete, "+" button creates a note)

**Interfaces:**
- Consumes: `store.updateNote`, `store.removeNote`, `store.restoreNote` (Task 3).
- Produces: `initModal({ onSave, onDelete }): void`, `openModal(nota): void`, `closeModal(): void`, `attachModalHandlers(): void` — consumed unchanged by Task 6 (drag click handler) and Task 9 (no change needed, same interface).
- Produces: `showUndoToast(message, onUndo): void`.

- [ ] **Step 1: Add modal + toast markup to `index.html`, right before `<script type="module"...>`**

```html
  <div id="modal-nota" class="modal">
    <div class="modal-caja">
      <label class="modal-label">Título
        <input id="modal-titulo" type="text" class="modal-input">
      </label>
      <label class="modal-label">Descripción
        <textarea id="modal-descripcion" class="modal-textarea" rows="4"></textarea>
      </label>
      <label class="modal-label modal-check">
        <input id="modal-completada" type="checkbox">
        Completada
      </label>
      <div class="modal-botones">
        <button id="modal-eliminar" type="button" class="modal-boton modal-eliminar">Eliminar</button>
        <button id="modal-cerrar" type="button" class="modal-boton">Cancelar</button>
        <button id="modal-guardar" type="button" class="modal-boton modal-guardar">Guardar</button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast"></div>
```

- [ ] **Step 2: Append modal/toast styles to `css/styles.css`**

```css
.modal {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .6);
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.modal.modal-abierto { display: flex; }

.modal-caja {
  background: #14161d;
  border-radius: 16px;
  padding: 20px;
  width: min(360px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-label {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-check { flex-direction: row; align-items: center; gap: 8px; }

.modal-input, .modal-textarea {
  background: #0b0d12;
  color: #e5e7eb;
  border: 1px solid #2a2e3a;
  border-radius: 8px;
  padding: 8px;
  font-size: 13px;
}

.modal-botones {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.modal-boton {
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  background: #1f2330;
  color: #e5e7eb;
}

.modal-guardar { background: #22c55e; color: #052e14; font-weight: 700; }
.modal-eliminar { background: #db2777; color: #3b0a24; margin-right: auto; }

.toast {
  display: none;
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #14161d;
  color: #e5e7eb;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  align-items: center;
  gap: 10px;
  z-index: 20;
}

.toast.toast-visible { display: flex; }

.toast-deshacer {
  background: #374151;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
}
```

- [ ] **Step 3: Write `js/modal.js`**

```js
let modalEl = null;
let currentId = null;
let onSaveCallback = null;
let onDeleteCallback = null;

export function initModal({ onSave, onDelete }) {
  onSaveCallback = onSave;
  onDeleteCallback = onDelete;
  modalEl = document.getElementById('modal-nota');
}

export function openModal(nota) {
  currentId = nota.id;
  document.getElementById('modal-titulo').value = nota.titulo;
  document.getElementById('modal-descripcion').value = nota.descripcion;
  document.getElementById('modal-completada').checked = nota.completada;
  modalEl.classList.add('modal-abierto');
}

export function closeModal() {
  modalEl.classList.remove('modal-abierto');
  currentId = null;
}

export function attachModalHandlers() {
  document.getElementById('modal-guardar').addEventListener('click', () => {
    if (!currentId) return;
    onSaveCallback(currentId, {
      titulo: document.getElementById('modal-titulo').value,
      descripcion: document.getElementById('modal-descripcion').value,
      completada: document.getElementById('modal-completada').checked,
    });
    closeModal();
  });

  document.getElementById('modal-eliminar').addEventListener('click', () => {
    if (!currentId) return;
    onDeleteCallback(currentId);
    closeModal();
  });

  document.getElementById('modal-cerrar').addEventListener('click', closeModal);
}
```

- [ ] **Step 4: Write `js/toast.js`**

```js
let toastTimeout = null;

export function showUndoToast(message, onUndo) {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimeout);
  toast.innerHTML = '';
  const texto = document.createElement('span');
  texto.textContent = message;
  toast.appendChild(texto);

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Deshacer';
  boton.className = 'toast-deshacer';
  boton.addEventListener('click', () => {
    onUndo();
    hideToast();
  });
  toast.appendChild(boton);

  toast.classList.add('toast-visible');
  toastTimeout = setTimeout(hideToast, 5000);
}

function hideToast() {
  const toast = document.getElementById('toast');
  toast.classList.remove('toast-visible');
  toast.innerHTML = '';
}
```

- [ ] **Step 5: Modify `js/app.js`** — add modal wiring and note creation, keep existing render/seed/nav code from Task 4

```js
import { getWeekStart, getWeekDates, addWeeks, formatWeekRange } from './dateUtils.js';
import * as noteStore from './noteStore.js';
import { renderWeek } from './render.js';
import { initModal, openModal, attachModalHandlers } from './modal.js';
import { showUndoToast } from './toast.js';

const store = noteStore;
let currentWeekStart = getWeekStart(new Date());

const semanaEl = document.getElementById('semana');
const rangoEl = document.getElementById('rango-semana');

function render() {
  const weekDates = getWeekDates(currentWeekStart);
  rangoEl.textContent = formatWeekRange(weekDates);
  renderWeek({ container: semanaEl, weekDates, store });
}

function seedIfEmpty() {
  if (store.getAllNotes().length > 0) return;
  const [lunes, martes] = getWeekDates(currentWeekStart);
  store.addNote({ dia: lunes, tipo: 'tarea', titulo: 'Llamar proveedor', tamano: 'mediano', posicionX: 14, posicionY: 34 });
  store.addNote({ dia: lunes, tipo: 'nota', titulo: 'Revisar correo', tamano: 'mediano', posicionX: 44, posicionY: 104 });
  store.addNote({ dia: martes, tipo: 'actividad', titulo: 'Reunión con equipo 10am', tamano: 'grande', posicionX: 20, posicionY: 36, fijada: true });
}

function handleSave(id, patch) {
  store.updateNote(id, patch);
}

function handleDelete(id) {
  const eliminada = store.removeNote(id);
  if (eliminada) {
    showUndoToast('Nota eliminada.', () => store.restoreNote(eliminada));
  }
}

initModal({ onSave: handleSave, onDelete: handleDelete });
attachModalHandlers();

semanaEl.addEventListener('click', (event) => {
  const boton = event.target.closest('.dia-agregar');
  if (!boton) return;
  const nueva = store.addNote({
    dia: boton.dataset.dia,
    tipo: 'tarea',
    titulo: 'Nueva nota',
    posicionX: 20,
    posicionY: 40,
  });
  openModal(nueva);
});

document.getElementById('semana-anterior').addEventListener('click', () => {
  currentWeekStart = addWeeks(currentWeekStart, -1);
  render();
});
document.getElementById('semana-siguiente').addEventListener('click', () => {
  currentWeekStart = addWeeks(currentWeekStart, 1);
  render();
});
document.getElementById('semana-hoy').addEventListener('click', () => {
  currentWeekStart = getWeekStart(new Date());
  render();
});

seedIfEmpty();
store.subscribe(render);
```

- [ ] **Step 6: Manual verification in the browser**
  - Click "+" on a day → a "Nueva nota" note appears and the modal opens; edit the title/description, check "Completada", click "Guardar" → note updates on the board with the dimmed+✔ look.
  - Click "Eliminar" on a note → note disappears, a toast with "Deshacer" appears; click "Deshacer" within 5s → note reappears in the same spot.
  - Wait out the 5s without clicking "Deshacer" → toast disappears and note stays deleted.

- [ ] **Step 7: Commit**

```bash
git add index.html css/styles.css js/modal.js js/toast.js js/app.js
git commit -m "Añadir modal de edición, completado y borrado con deshacer"
```

---

### Task 6: Drag to reposition and move between days

**Files:**
- Create: `js/dragDrop.js`
- Modify: `js/app.js` (call `attachDragHandlers`, click opens modal, double-click toggles pin)

**Interfaces:**
- Consumes: `store.updateNote` (Task 3), `openModal` (Task 5).
- Produces: `attachDragHandlers(container, { store, onClick }): void`.

- [ ] **Step 1: Write `js/dragDrop.js`**

```js
const DRAG_THRESHOLD = 5;

export function attachDragHandlers(container, { store, onClick }) {
  container.addEventListener('pointerdown', (event) => {
    const nota = event.target.closest('.nota');
    if (!nota) return;

    const columnaOrigen = nota.closest('.dia-columna');
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = parseFloat(nota.style.left) || 0;
    const startTop = parseFloat(nota.style.top) || 0;
    let moved = false;

    nota.setPointerCapture(event.pointerId);
    nota.style.cursor = 'grabbing';

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) moved = true;
      if (moved) {
        nota.style.left = `${startLeft + dx}px`;
        nota.style.top = `${startTop + dy}px`;
      }
    }

    function onUp(upEvent) {
      nota.releasePointerCapture(event.pointerId);
      nota.style.cursor = 'grab';
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerup', onUp);

      if (!moved) {
        onClick(nota.dataset.id);
        return;
      }

      const destino = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest('.dia-columna') || columnaOrigen;
      const destRect = destino.getBoundingClientRect();
      const nuevoX = Math.max(0, upEvent.clientX - destRect.left - nota.offsetWidth / 2);
      const nuevoY = Math.max(0, upEvent.clientY - destRect.top - nota.offsetHeight / 2);

      store.updateNote(nota.dataset.id, {
        dia: destino.dataset.dia,
        posicionX: Math.round(nuevoX),
        posicionY: Math.round(nuevoY),
      });
    }

    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerup', onUp);
  });

  container.addEventListener('dblclick', (event) => {
    const nota = event.target.closest('.nota');
    if (!nota) return;
    const actual = store.getAllNotes().find((n) => n.id === nota.dataset.id);
    if (actual) store.updateNote(actual.id, { fijada: !actual.fijada });
  });
}
```

- [ ] **Step 2: Modify `js/app.js`** — import and wire drag handlers, route note clicks to the modal

```js
import { attachDragHandlers } from './dragDrop.js';
```

Add near the other event wiring (after `attachModalHandlers();`):

```js
function handleNotaClick(id) {
  const nota = store.getAllNotes().find((n) => n.id === id);
  if (nota) openModal(nota);
}

attachDragHandlers(semanaEl, { store, onClick: handleNotaClick });
```

- [ ] **Step 3: Manual verification in the browser**
  - Click a note (without moving the mouse) → modal opens (same as Task 5).
  - Press and drag a note within the same day → it follows the cursor and stays at the new position after release.
  - Drag a note into a different day column and release → the note now belongs to that day (moves column on next render), original day shows "Sin pendientes" if it was the only note there.
  - Double-click a note → gold ring + ⭐ toggle on/off.

- [ ] **Step 4: Commit**

```bash
git add js/dragDrop.js js/app.js
git commit -m "Permitir arrastrar notas dentro del día y entre días, fijar con doble clic"
```

---

### Task 7: Verify combined visual states

**Files:**
- None created — this task is a manual confirmation pass using Tasks 1–6 as built (no code changes expected unless a mismatch is found).

**Interfaces:** none (verification only).

- [ ] **Step 1: In the running app, create/edit notes via the "+" button and modal to produce these four states side by side:**
  1. A note that is `activa` only (not completed, not pinned) — should glow in its category color.
  2. A note that is `fijada` only (double-click to pin, mark completed unchecked... actually keep it not completed) — should show category glow **and** the gold ring together (per the "ambos combinados" decision).
  3. A note marked `completada` (check the box in the modal) — dimmed, big green ✔, no category glow, gold ring only if also pinned.
  4. A note that is both `fijada` and `completada` — dimmed + ✔ + gold ring, no category glow (since `activa` glow only applies when not completed).

- [ ] **Step 2: If any state doesn't match the approved mockup (spec section "Estado visual"), fix the relevant CSS rule in `css/styles.css` from Task 1 (class combinations `.nota.activa.nota-*`, `.nota.completada`, `.nota.fijada::after`) and re-verify.**

- [ ] **Step 3: Commit only if a fix was needed**

```bash
git add css/styles.css
git commit -m "Ajustar combinación visual de estados fijada/completada/activa"
```

---

### Task 8: Mobile — one day at a time with swipe

**Files:**
- Modify: `css/styles.css` (mobile breakpoint)
- Modify: `js/app.js` (track `mobileDayIndex`, apply visibility class, swipe listener)

**Interfaces:**
- Consumes: `renderWeek` (Task 4/6, unchanged), `getWeekDates` (Task 2).
- Produces: no new exported interface — internal to `app.js`.

- [ ] **Step 1: Append mobile styles to `css/styles.css`**

```css
@media (max-width: 640px) {
  .semana {
    overflow-x: hidden;
  }

  .dia-columna {
    display: none;
    min-width: 100%;
  }

  .dia-columna.visible-movil {
    display: block;
  }
}
```

- [ ] **Step 2: Modify `js/app.js`** — add mobile day index and swipe handling

Add near the top, alongside `currentWeekStart`:

```js
let mobileDayIndex = 0;
```

Modify the `render()` function to mark the visible day for mobile:

```js
function render() {
  const weekDates = getWeekDates(currentWeekStart);
  rangoEl.textContent = formatWeekRange(weekDates);
  renderWeek({ container: semanaEl, weekDates, store });

  const columnas = semanaEl.querySelectorAll('.dia-columna');
  columnas.forEach((columna, index) => {
    columna.classList.toggle('visible-movil', index === mobileDayIndex);
  });
}
```

Add swipe detection near the other event wiring:

```js
let swipeStartX = null;

semanaEl.addEventListener('touchstart', (event) => {
  swipeStartX = event.touches[0].clientX;
});

semanaEl.addEventListener('touchend', (event) => {
  if (swipeStartX === null) return;
  const deltaX = event.changedTouches[0].clientX - swipeStartX;
  swipeStartX = null;
  if (Math.abs(deltaX) < 50) return;

  if (deltaX < 0 && mobileDayIndex < 6) mobileDayIndex += 1;
  if (deltaX > 0 && mobileDayIndex > 0) mobileDayIndex -= 1;
  render();
});
```

- [ ] **Step 3: Manual verification**
  - Open Chrome DevTools, toggle device toolbar (any phone preset, width < 640px).
  - Confirm only one day column is visible at a time, with the week label still showing the full week range.
  - Swipe left inside the day area → advances to the next day (up to Sunday, index 6, no further). Swipe right → goes back (down to Monday, index 0, no further).
  - Resize back to desktop width → all 7 columns show again side by side.

- [ ] **Step 4: Commit**

```bash
git add css/styles.css js/app.js
git commit -m "Vista móvil de un día con deslizar para cambiar de día"
```

---

### Task 9: Firebase Firestore — shared real-time storage

**Files:**
- Create: `js/firebaseConfig.js`
- Create: `js/firestoreStore.js`
- Modify: `index.html` (add offline-status element)
- Modify: `css/styles.css` (offline-status style)
- Modify: `js/app.js` (swap `noteStore.js` import for `firestoreStore.js`, remove the local-only seed call)

**Interfaces:**
- Produces: `firestoreStore.js` implementing the exact same interface as `noteStore.js` from Task 3: `subscribe`, `addNote`, `updateNote`, `removeNote`, `restoreNote`, `getNotesForDay`, `getAllNotes` (all now async under the hood, but `app.js`, `render.js`, and `dragDrop.js` call them the same way — `addNote`/`updateNote`/`removeNote`/`restoreNote` become fire-and-forget calls whose result arrives via the `onSnapshot` listener, not via their return value).

- [ ] **Step 1: Create the Firebase project (do this once, in the Firebase console, before writing code)**
  1. Go to the Firebase console and create a new project (any name, e.g. "calendario-semanal").
  2. Inside the project, click "Firestore Database" → "Create database" → start in **production mode** → pick any region.
  3. Go to the "Rules" tab of Firestore and replace the contents with:
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /notas/{notaId} {
           allow read, write: if true;
         }
       }
     }
     ```
     Click "Publish". (This matches the design's explicit "no login, open access" decision.)
  4. Go to Project settings (gear icon) → "General" → scroll to "Your apps" → click the `</>` (web) icon → register an app (any nickname, no hosting needed) → copy the `firebaseConfig` object shown.

- [ ] **Step 2: Write `js/firebaseConfig.js`** — paste in the values copied in Step 1

```js
export const firebaseConfig = {
  apiKey: 'PASTE_YOUR_API_KEY',
  authDomain: 'PASTE_YOUR_PROJECT.firebaseapp.com',
  projectId: 'PASTE_YOUR_PROJECT_ID',
  storageBucket: 'PASTE_YOUR_PROJECT.appspot.com',
  messagingSenderId: 'PASTE_YOUR_SENDER_ID',
  appId: 'PASTE_YOUR_APP_ID',
};
```

- [ ] **Step 3: Write `js/firestoreStore.js`**

```js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const notasRef = collection(db, 'notas');

let cache = [];
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener(cache.slice());
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(cache.slice());
  return () => listeners.delete(listener);
}

onSnapshot(
  notasRef,
  (snapshot) => {
    cache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    notify();
    document.getElementById('estado-conexion')?.classList.remove('visible');
  },
  (error) => {
    console.error('Firestore desconectado:', error);
    document.getElementById('estado-conexion')?.classList.add('visible');
  },
);

export async function addNote(partial) {
  const nota = {
    dia: partial.dia,
    tipo: partial.tipo,
    titulo: partial.titulo || '',
    descripcion: partial.descripcion || '',
    color: partial.color || partial.tipo,
    posicionX: partial.posicionX ?? 20,
    posicionY: partial.posicionY ?? 40,
    tamano: partial.tamano || 'mediano',
    fijada: partial.fijada ?? false,
    completada: partial.completada ?? false,
    creadoEn: Date.now(),
  };
  const ref = await addDoc(notasRef, nota);
  return { id: ref.id, ...nota };
}

export async function updateNote(id, patch) {
  await updateDoc(doc(db, 'notas', id), patch);
  return null;
}

export async function removeNote(id) {
  const nota = cache.find((n) => n.id === id);
  if (!nota) return null;
  await deleteDoc(doc(db, 'notas', id));
  return nota;
}

export async function restoreNote(nota) {
  const { id, ...datos } = nota;
  const ref = await addDoc(notasRef, datos);
  return { id: ref.id, ...datos };
}

export function getNotesForDay(dia) {
  return cache.filter((n) => n.dia === dia);
}

export function getAllNotes() {
  return cache.slice();
}
```

- [ ] **Step 4: Add the offline banner to `index.html`**, right after the `<header class="barra-superior">` closing tag:

```html
  <div id="estado-conexion" class="estado-conexion">Sin conexión, mostrando última versión guardada.</div>
```

- [ ] **Step 5: Add its style to `css/styles.css`**

```css
.estado-conexion {
  display: none;
  background: #7c2d12;
  color: #fff;
  text-align: center;
  font-size: 12px;
  padding: 6px;
}

.estado-conexion.visible { display: block; }
```

- [ ] **Step 6: Modify `js/app.js`** — swap the store import and remove the local-only seed (Firestore now holds real data)

```js
import * as noteStore from './firestoreStore.js';
```

Delete the `seedIfEmpty` function and its call (`seedIfEmpty();`) — Firestore starts empty and the "+" button is now how the first notes get created.

- [ ] **Step 7: Manual verification**
  - Open `index.html` in two separate browser tabs (or two devices) side by side.
  - Create a note in tab A → within a second or two it appears in tab B without reloading.
  - Drag/pin/complete/delete a note in tab B → tab A updates live.
  - Turn off your internet connection briefly → the orange "Sin conexión..." banner appears; turn it back on → it disappears and any pending change syncs.

- [ ] **Step 8: Commit**

```bash
git add js/firebaseConfig.js js/firestoreStore.js index.html css/styles.css js/app.js
git commit -m "Conectar Firestore para sincronizar notas en tiempo real sin login"
```

---

### Task 10: Publish to GitHub Pages

**Files:** none (repo/hosting operations only).

- [ ] **Step 1: Confirm with the user before this step** — creating a public GitHub repo and pushing code is a visible, shared-state action. Ask explicitly: "¿Confirmas que cree el repositorio en GitHub y publique el sitio?" before running the commands below.

- [ ] **Step 2: Create the GitHub repository** (after confirmation)

```bash
cd calendario-semanal
gh repo create calendario-semanal --public --source=. --remote=origin
```

- [ ] **Step 3: Push the code**

```bash
git push -u origin master
```

- [ ] **Step 4: Enable GitHub Pages**

```bash
gh api repos/:owner/calendario-semanal/pages -X POST -f "source[branch]=master" -f "source[path]=/"
```

- [ ] **Step 5: Verify the live site**
  - Run `gh api repos/:owner/calendario-semanal/pages --jq .html_url` to get the public URL.
  - Open it in a browser, confirm the calendar loads, and repeat the two-tab sync check from Task 9 Step 7 against the live URL.

---

## Self-Review Notes

- **Spec coverage:** visual style (Task 1/7), week nav with Hoy button (Task 2/4), free drag positioning + moving between days (Task 6), pin with gold ring (Task 1/6/7), pending glow vs completed check+dim (Task 1/7), combined pin+active glow (Task 7), modal with long description + completed checkbox (Task 5), delete with 5s undo (Task 5), empty-day message (Task 4), offline banner (Task 9), mobile one-day-with-swipe (Task 8), Firebase real-time no-login sync (Task 9), GitHub Pages publish (Task 10). All covered.
- **Placeholder scan:** no TBD/TODO; the only intentional placeholders are the literal `PASTE_YOUR_...` values in `firebaseConfig.js`, which is correct — those values don't exist until the user creates their own Firebase project in Task 9 Step 1, and the file is git-tracked (not secret) since a Firebase web config is not a credential.
- **Type/interface consistency:** `subscribe/addNote/updateNote/removeNote/restoreNote/getNotesForDay/getAllNotes` are the same names and calling convention across `noteStore.js` (Task 3) and `firestoreStore.js` (Task 9); `render.js`, `dragDrop.js`, and `app.js` call the store only through this interface, so Task 9's swap is a one-line import change as designed.
