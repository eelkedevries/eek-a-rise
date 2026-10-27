import { allItems, onItemsChange, type ImageItem } from '../state';

export interface GalleryOptions {
  includeChessboards: boolean;
  onSelect(item: ImageItem): void;
}

export interface Gallery {
  select(id: string | null): void;
  selected(): string | null;
}

const GROUP_ORDER = ['Your images', 'Ida', 'Ben', 'Cas', 'Chessboards'];

/** Thumbnails grouped by identity, the visitor's uploads first; the selected item is highlighted. */
export function mountGallery(container: HTMLElement, options: GalleryOptions): Gallery {
  let selectedId: string | null = null;

  const render = () => {
    const visible = allItems().filter((item) => options.includeChessboards || item.kind !== 'chessboard');
    const groups = [...new Set(visible.map((item) => item.group))].sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
    container.replaceChildren(
      ...groups.map((group) => {
        const section = document.createElement('div');
        section.className = 'gallery-group';
        const heading = document.createElement('h3');
        heading.textContent = group;
        const list = document.createElement('div');
        list.className = 'gallery-items';
        for (const item of visible.filter((i) => i.group === group)) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'thumb';
          button.title = item.label;
          button.dataset.id = item.id;
          button.setAttribute('aria-pressed', String(item.id === selectedId));
          const img = document.createElement('img');
          img.src = item.thumb;
          img.alt = item.label;
          img.width = img.height = 72;
          button.append(img);
          button.addEventListener('click', () => {
            gallery.select(item.id);
            options.onSelect(item);
          });
          list.append(button);
        }
        section.append(heading, list);
        return section;
      }),
    );
  };

  const gallery: Gallery = {
    select(id) {
      selectedId = id;
      for (const button of container.querySelectorAll<HTMLButtonElement>('.thumb')) {
        button.setAttribute('aria-pressed', String(button.dataset.id === id));
      }
    },
    selected: () => selectedId,
  };

  onItemsChange(render);
  render();
  return gallery;
}
