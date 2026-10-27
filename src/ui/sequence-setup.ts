/** The Sequence tab, set-up: the image list, the preparation, the parameters and the schedule preview. */
import { planSequence, type Plan } from '../core/plan';
import { applyOutline, DEFAULT_ELLIPSE, prepareImage } from '../core/preprocess';
import { schedule, type Row } from '../core/schedule';
import { toUint8 } from '../core/stats';
import { DEFAULT_SETTINGS, demoSequenceIds, itemById, loadSettings, onItemsChange, saveSettings, type ImageItem, type SequenceSettings } from '../state';
import { drawGrey, randomSeed } from './draw';

export interface SequenceSetup {
  settings(): SequenceSettings;
  images(): ImageItem[];
  plan(): Plan;
  rows(): Row[] | null;
  add(item: ImageItem): void;
  resetImages(): void;
  onChange(listener: () => void): void;
}

/** A distinct colour per image position, for the timeline and the legend. */
export function imageColour(index: number): string {
  return `hsl(${(index * 137.508) % 360} 55% 58%)`;
}

const NUMBER_FIELDS = ['fps', 'tagHz', 'cyclesPerImage', 'baselineS', 'stimulusS', 'postS', 'peak', 'normMean', 'normRms', 'seed'] as const;

export function mountSequenceSetup(root: HTMLElement): SequenceSetup {
  const $ = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const list = $<HTMLOListElement>('#seq-list');
  const form = $<HTMLFormElement>('#seq-params');
  const messages = $<HTMLUListElement>('#seq-messages');
  const summary = $<HTMLElement>('#seq-summary');
  const timeline = $<HTMLCanvasElement>('#seq-timeline');
  const legend = $<HTMLUListElement>('#seq-legend');
  const preview = $<HTMLCanvasElement>('#seq-preview');
  const previewCaption = $<HTMLElement>('#seq-preview-caption');
  const overlay = $<SVGElement>('.prep-stage .outline-overlay');
  const sizeSelect = $<HTMLSelectElement>('#seq-size');
  const outline = $<HTMLInputElement>('#seq-outline');
  const ellipseBox = $<HTMLElement>('#seq-ellipse');

  let settings = loadSettings();
  let ids: string[] = [];
  let selected: string | null = null;
  let currentPlan: Plan = planSequence({ ...settings, nImages: 0 });
  let currentRows: Row[] | null = null;
  const listeners = new Set<() => void>();

  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;

  function writeForm(): void {
    for (const name of NUMBER_FIELDS) field(name).value = String(settings[name]);
    field('method').value = settings.method;
    (field('normalise') as HTMLInputElement).checked = settings.normalise;
    (field('fixation') as HTMLInputElement).checked = settings.fixation;
    sizeSelect.value = String(settings.size);
    outline.checked = settings.outline;
    for (const slider of ellipseBox.querySelectorAll<HTMLInputElement>('input[type="range"]')) {
      slider.value = String(settings.ellipse[slider.dataset.key as keyof typeof settings.ellipse]);
    }
  }

  function readForm(): void {
    for (const name of NUMBER_FIELDS) settings[name] = Number(field(name).value);
    settings.method = field('method').value as SequenceSettings['method'];
    settings.normalise = (field('normalise') as HTMLInputElement).checked;
    settings.fixation = (field('fixation') as HTMLInputElement).checked;
    settings.size = Number(sizeSelect.value);
    settings.outline = outline.checked;
    for (const slider of ellipseBox.querySelectorAll<HTMLInputElement>('input[type="range"]')) {
      settings.ellipse[slider.dataset.key as keyof typeof settings.ellipse] = Number(slider.value);
    }
  }

  function images(): ImageItem[] {
    return ids.map((id) => itemById(id)).filter((item): item is ImageItem => Boolean(item));
  }

  function renderList(): void {
    const items = images();
    list.replaceChildren(
      ...items.map((item, index) => {
        const li = document.createElement('li');
        li.className = 'image-row';
        li.classList.toggle('selected', item.id === selected && index === ids.indexOf(selected));
        const swatch = document.createElement('span');
        swatch.className = 'swatch';
        swatch.style.background = imageColour(index);
        const thumb = document.createElement('img');
        thumb.src = item.thumb;
        thumb.alt = '';
        thumb.width = thumb.height = 36;
        const label = document.createElement('button');
        label.type = 'button';
        label.className = 'image-label';
        label.textContent = item.label;
        label.title = 'Show prepared';
        label.addEventListener('click', () => {
          selected = item.id;
          renderList();
          void updatePreview();
        });
        const tools = document.createElement('span');
        tools.className = 'row-tools';
        const tool = (text: string, title: string, action: () => void, disabled = false) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'icon-button';
          b.textContent = text;
          b.title = b.ariaLabel = title;
          b.disabled = disabled;
          b.addEventListener('click', action);
          tools.append(b);
        };
        tool('↑', `Move ${item.label} up`, () => move(index, -1), index === 0);
        tool('↓', `Move ${item.label} down`, () => move(index, 1), index === items.length - 1);
        tool('×', `Remove ${item.label}`, () => {
          ids.splice(index, 1);
          changed();
        });
        li.append(swatch, thumb, label, tools);
        return li;
      }),
    );
  }

  function move(index: number, step: number): void {
    const target = index + step;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    changed();
  }

  async function updatePreview(): Promise<void> {
    const item = (selected && itemById(selected)) || images()[0];
    overlay.toggleAttribute('hidden', !settings.outline);
    const ellipse = overlay.querySelector('ellipse')!;
    for (const key of ['cx', 'cy', 'rx', 'ry'] as const) ellipse.setAttribute(key, String(settings.ellipse[key]));
    ellipseBox.hidden = !settings.outline;
    if (!item) {
      previewCaption.textContent = 'No image selected.';
      return;
    }
    const size = settings.size;
    let grey = prepareImage(await item.load(), size);
    if (settings.outline) grey = applyOutline(grey, size, settings.ellipse);
    const pixels = new Uint8Array(grey.length);
    toUint8(grey, pixels);
    drawGrey(preview, pixels, size);
    previewCaption.textContent = `${item.label}, prepared at ${size} × ${size} px. Brightness and contrast are matched across the set when the sequence is built.`;
  }

  function hints(): void {
    const f = currentPlan.frames;
    const set = (key: string, text: string) => ($<HTMLElement>(`[data-hint="${key}"]`).textContent = text);
    set('period', f ? `= ${f.period} frames per cycle` : '');
    set('baseline', f ? `= ${f.baseline} frames` : '');
    set('stimulus', f ? `= ${f.stimulus} frames, ${f.cycles} cycles` : '');
    set('post', f ? `= ${f.post} frames` : '');
  }

  function drawTimeline(): void {
    const width = Math.max(240, Math.round(timeline.getBoundingClientRect().width || 600));
    const ratio = window.devicePixelRatio || 1;
    timeline.width = width * ratio;
    timeline.height = 90 * ratio;
    const ctx = timeline.getContext('2d')!;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, 90);
    legend.replaceChildren();
    const rows = currentRows;
    if (!rows || rows.length === 0) return;
    const x = (n: number) => (n / rows.length) * width;
    const top = 8, h = 56;
    for (const row of rows) {
      ctx.fillStyle = row.segment === 'stimulus' ? imageColour(row.image) : '#3a3a46';
      ctx.globalAlpha = row.segment === 'stimulus' ? 0.35 : 0.8;
      ctx.fillRect(x(row.frame), top, x(row.frame + 1) - x(row.frame) + 0.5, h);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#e8b43a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    rows.forEach((row, n) => {
      const y = top + h - row.weight * h;
      if (n === 0) ctx.moveTo(x(n + 0.5), y);
      else ctx.lineTo(x(n + 0.5), y);
    });
    ctx.stroke();
    ctx.fillStyle = '#9a9aa4';
    ctx.font = '11px "JetBrains Mono", monospace';
    const seconds = rows.length / settings.fps;
    const step = seconds > 20 ? 5 : seconds > 8 ? 2 : 1;
    for (let t = 0; t <= seconds + 1e-9; t += step) ctx.fillText(`${t} s`, Math.min(x(t * settings.fps), width - 28), 84);
    const shown = new Map<number, number>();
    for (const row of rows) if (row.segment === 'stimulus') shown.set(row.image, (shown.get(row.image) ?? 0) + 1);
    const items = images();
    for (const [index, frames] of [...shown].sort((a, b) => a[0] - b[0])) {
      const li = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = imageColour(index);
      li.append(swatch, `${items[index]?.label ?? `Image ${index + 1}`}: ${Math.round(frames / currentPlan.frames!.period)} cycle(s)`);
      legend.append(li);
    }
  }

  function changed(): void {
    readForm();
    saveSettings(settings);
    const items = images();
    currentPlan = planSequence({ ...settings, nImages: items.length });
    currentRows = currentPlan.errors.length === 0 ? schedule({ ...settings, nImages: items.length }) : null;
    messages.replaceChildren(
      ...currentPlan.errors.map((text) => Object.assign(document.createElement('li'), { className: 'error', textContent: text })),
      ...currentPlan.notes.map((text) => Object.assign(document.createElement('li'), { className: 'note', textContent: text })),
    );
    const p = currentPlan;
    summary.textContent = p.frames
      ? `${p.totalFrames} frames (${(p.totalFrames / settings.fps).toFixed(2)} s) at ${settings.size} × ${settings.size} px, about ${Math.max(1, Math.round(p.bytes / 1048576))} MB.`
      : '';
    hints();
    renderList();
    drawTimeline();
    void updatePreview();
    for (const listener of listeners) listener();
  }

  form.addEventListener('input', changed);
  form.addEventListener('change', changed);
  form.addEventListener('submit', (event) => event.preventDefault());
  sizeSelect.addEventListener('change', changed);
  outline.addEventListener('change', changed);
  ellipseBox.addEventListener('input', changed);
  $<HTMLButtonElement>('#seq-ellipse-reset').addEventListener('click', () => {
    settings.ellipse = { ...DEFAULT_ELLIPSE };
    writeForm();
    changed();
  });
  $<HTMLButtonElement>('#seq-new-seed').addEventListener('click', () => {
    field('seed').value = String(randomSeed());
    changed();
  });
  $<HTMLButtonElement>('#seq-defaults').addEventListener('click', () => {
    settings = structuredClone(DEFAULT_SETTINGS);
    writeForm();
    changed();
  });
  $<HTMLButtonElement>('#seq-reset').addEventListener('click', () => api.resetImages());
  $<HTMLButtonElement>('#seq-clear').addEventListener('click', () => {
    ids = [];
    selected = null;
    changed();
  });
  window.addEventListener('resize', drawTimeline);
  let seeded = false;
  onItemsChange(() => {
    if (!seeded && demoSequenceIds().length > 0) {
      ids = demoSequenceIds();
      seeded = true;
    }
    changed();
  });

  const api: SequenceSetup = {
    settings: () => structuredClone(settings),
    images,
    plan: () => currentPlan,
    rows: () => currentRows,
    add(item) {
      if (item.kind === 'chessboard') return;
      ids.push(item.id);
      selected = item.id;
      changed();
    },
    resetImages() {
      ids = demoSequenceIds();
      selected = null;
      changed();
    },
    onChange(listener) {
      listeners.add(listener);
    },
  };

  writeForm();
  changed();
  return api;
}
