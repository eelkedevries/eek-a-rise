import '@fontsource/lexend/latin-300.css';
import '@fontsource/lexend/latin-400.css';
import '@fontsource/lexend/latin-600.css';
import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral/latin-500.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import './style.css';

import { linkTags, renderHowItWorks } from './content/render';
import { acceptDrops, ImageInputError } from './image-input';
import { mountDownloads } from './ui/downloads';
import { addUpload, allItems, loadExamples, type ImageItem } from './state';
import { mountGallery, type Gallery } from './ui/gallery';
import { mountOneImage } from './ui/one-image';
import { mountSequencePlayer } from './ui/sequence-player';
import { mountSequenceSetup } from './ui/sequence-setup';
import { mountTabs } from './ui/tabs';

renderHowItWorks(document.querySelector('#how')!);
linkTags(document.querySelector('#panel-sequence')!);

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

const oneImage = mountOneImage(panels.one, status);
const setup = mountSequenceSetup(panels.sequence);
const player = mountSequencePlayer(panels.sequence, setup);
mountDownloads(document.querySelector('#seq-downloads')!, player);

const galleries: Record<'one' | 'sequence', Gallery> = {
  one: mountGallery(document.querySelector('#gallery-one')!, {
    includeChessboards: true,
    onSelect: (item: ImageItem) => {
      status('');
      void oneImage.show(item);
    },
  }),
  sequence: mountGallery(document.querySelector('#gallery-sequence')!, {
    includeChessboards: false,
    onSelect: (item: ImageItem) => {
      setup.add(item);
      galleries.sequence.select(null);
      status(`Added ${item.label} to the sequence.`);
    },
  }),
};

async function upload(file: File): Promise<void> {
  try {
    status('Opening the image on this device…');
    const item = await addUpload(file);
    const gallery = activePanel === panels.one ? galleries.one : galleries.sequence;
    gallery.select(item.id);
    status(`Added ${item.label}.`);
    if (activePanel === panels.one) await oneImage.show(item);
    else {
      setup.add(item);
      galleries.sequence.select(null);
      status(`Added ${item.label} to the sequence.`);
    }
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

loadExamples()
  .then(() => {
    const first = allItems().find((item) => item.id === 'ida_eyes_wide') ?? allItems()[0];
    if (!first) return;
    galleries.one.select(first.id);
    void oneImage.show(first);
  })
  .catch(() => status('The examples could not be loaded.', true));
