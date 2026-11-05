// Kleines Konfigurationspanel ohne Abhängigkeiten.
// schema: { type: 'number'|'color'|'boolean'|'select'|'text', min, max, step, options, label }
export class GUI {
  constructor(root) { this.root = root; }

  folder(name, open = true) {
    const d = document.createElement('details');
    d.open = open;
    const s = document.createElement('summary'); s.textContent = name;
    const body = document.createElement('div'); body.className = 'folder-body';
    d.append(s, body); this.root.append(d);
    return new GUI(body);
  }

  add(obj, key, schema, onChange) {
    const row = document.createElement('label'); row.className = 'row';
    const name = document.createElement('span'); name.className = 'row-label'; name.textContent = schema.label || key;
    row.append(name);
    const fire = () => onChange && onChange(key, obj[key]);
    let input;
    if (schema.type === 'number') {
      const wrap = document.createElement('span'); wrap.className = 'num';
      input = document.createElement('input'); input.type = 'range';
      input.min = schema.min; input.max = schema.max; input.step = schema.step ?? 1; input.value = obj[key];
      // Textfeld statt type=number: nimmt „0,5“ und „0.5“ an (deutsche Tastatur), ungültige Eingaben werden verworfen
      const num = document.createElement('input'); num.type = 'text'; num.inputMode = 'decimal';
      const show = v => String(+(+v).toFixed(4)).replace('.', ',');
      num.value = show(obj[key]);
      input.oninput = () => { obj[key] = parseFloat(input.value); num.value = show(input.value); fire(); };
      num.onchange = () => {
        let v = parseFloat(String(num.value).replace(',', '.').trim());
        if (!Number.isFinite(v)) { num.value = show(obj[key]); return; }
        if (schema.min !== undefined) v = Math.max(schema.min, v);
        if (schema.max !== undefined) v = Math.min(schema.max, v);
        obj[key] = v; input.value = v; num.value = show(v); fire();
      };
      wrap.append(input, num); row.append(wrap);
      row.sync = () => { input.value = obj[key]; num.value = show(obj[key]); };
    } else if (schema.type === 'color') {
      input = document.createElement('input'); input.type = 'color'; input.value = obj[key];
      input.oninput = () => { obj[key] = input.value; fire(); };
      row.append(input); row.sync = () => input.value = obj[key];
    } else if (schema.type === 'boolean') {
      input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!obj[key];
      input.onchange = () => { obj[key] = input.checked; fire(); };
      row.append(input); row.sync = () => input.checked = !!obj[key];
    } else if (schema.type === 'select') {
      input = document.createElement('select');
      for (const o of schema.options) { const op = document.createElement('option'); op.value = o; op.textContent = o; input.append(op); }
      input.value = obj[key];
      input.onchange = () => { obj[key] = input.value; fire(); };
      row.append(input); row.sync = () => input.value = obj[key];
    } else {
      input = document.createElement('input'); input.type = 'text'; input.value = obj[key] ?? '';
      input.oninput = () => { obj[key] = input.value; fire(); };
      row.append(input); row.sync = () => input.value = obj[key] ?? '';
    }
    this.root.append(row);
    return row;
  }

  button(text, fn, cls = '') {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.className = 'btn ' + cls;
    b.onclick = fn; this.root.append(b); return b;
  }

  note(text) {
    const p = document.createElement('p'); p.className = 'note'; p.textContent = text; this.root.append(p); return p;
  }

  clear() { this.root.innerHTML = ''; }
}
