import '@fontsource/lexend/latin-300.css';
import '@fontsource/lexend/latin-400.css';
import '@fontsource/lexend/latin-600.css';
import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral/latin-500.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import './style.css';

import { acceptDrops, ImageInputError } from './image-input';
import { addUpload, loadExamples, type ImageItem } from './state';
import { mountGallery, type Gallery } from './ui/gallery';
import { mountTabs } from './ui/tabs';

const uploadInput = document.querySelector<HTMLInputElement>('#upload-input')!;
const panels = {
  one: document.querySelector<HTMLElement>('#panel-one')!,
  sequence: document.querySelector<HTMLElement>('#panel-sequence')!,
};
let activePanel: HTMLElement = panels.one;

function status(message: string, error = false): void {
  const line = activePanel.querySelector<HTMLElement>('.status')!;
  line.textContent = message;
  line.classList.toggle('error', error);
}

const galleries: Record<'one' | 'sequence', Gallery> = {
  one: mountGallery(document.querySelector('#gallery-one')!, {
    includeChessboards: true,
    onSelect: (item: ImageItem) => status(`Selected: ${item.label}.`),
  }),
  sequence: mountGallery(document.querySelector('#gallery-sequence')!, {
    includeChessboards: false,
    onSelect: (item: ImageItem) => status(`Selected: ${item.label}.`),
  }),
};

async function upload(file: File): Promise<void> {
  try {
    status('Opening the image on this device…');
    const item = await addUpload(file);
    const gallery = activePanel === panels.one ? galleries.one : galleries.sequence;
    gallery.select(item.id);
    status(`Added ${item.label}.`);
  } catch (error) {
    status(error instanceof ImageInputError ? error.message : 'Something went wrong while opening that image.', true);
  }
}

mountTabs(document.querySelector('[role="tablist"]')!, (id) => {
  activePanel = id === 'tab-one' ? panels.one : panels.sequence;
});
for (const button of document.querySelectorAll<HTMLButtonElement>('.upload-button')) {
  button.addEventListener('click', () => uploadInput.click());
}
uploadInput.addEventListener('change', () => {
  const file = uploadInput.files?.[0];
  if (file) void upload(file);
  uploadInput.value = '';
});
acceptDrops(document.querySelector('#try')!, (file) => void upload(file));

loadExamples().catch(() => status('The examples could not be loaded.', true));
