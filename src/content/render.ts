/** Renders the content modules into the How it works section. */
import * as general from './how-it-works';
import * as about from './about';
import * as expert from './for-researchers';
import { references } from './references';

const BASE = import.meta.env.BASE_URL;

interface Figure {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

const paragraphs = (texts: string[]) => texts.map((t) => `<p>${t}</p>`).join('');

const figure = (f: Figure) =>
  `<figure class="figure"><img src="${BASE}${f.src}" width="${f.width}" height="${f.height}" alt="${f.alt}" loading="lazy" decoding="async" /><figcaption>${f.caption}</figcaption></figure>`;

export function renderHowItWorks(section: HTMLElement): void {
  section.insertAdjacentHTML(
    'beforeend',
    `<div class="prose">
      <h3>${general.title}</h3>
      ${paragraphs(general.intro)}
      <figure class="figure published-example">
        <h3>Original study: example trial</h3>
        <video class="published-video" controls playsinline preload="none" width="400" height="400" aria-label="Original compound face stimulus from de Vries and Baldauf (2019)" aria-describedby="published-example-caption">
          <source src="${expert.clipVideoUrl}" type="video/mp4" />
          <a href="${expert.clipUrl}">Watch or download the original example on Figshare</a>.
        </video>
        <figcaption id="published-example-caption">The original stimulus uses separate eye and mouth bands with a strip of scrambled noise between them. The interactive tool above uses whole images. ${expert.publishedClip}
          <a href="${expert.clipUrl}">Original video on Figshare</a> ·
          <a href="${expert.blogUrl}">Read the blog post about the study</a>.
        </figcaption>
      </figure>
      ${figure(general.figures.chessboard)}
      ${paragraphs(general.afterChessboard)}
      ${figure(general.figures.rise)}
      ${paragraphs(general.afterRise)}
      <details class="researchers" id="researchers">
        <summary>For researchers</summary>
        <h3>${expert.title}</h3>
        ${paragraphs(expert.method)}
        <p id="about-target">${expert.target}</p>
        <p id="about-inferred">${expert.inferredIntro}</p>
        <ul>${expert.inferred.map((t) => `<li>${t}</li>`).join('')}</ul>
        <p>${expert.caveats}</p>
        ${figure(expert.demoFigure)}
        <p><a href="${expert.clipUrl}">Published stimulus and source record</a> · <a href="${expert.blogUrl}">Blog post about the study</a>.</p>
      </details>
      <h3 id="references">References</h3>
      <ul class="references">${references.map((r) => `<li>${r.text} <a href="https://doi.org/${r.doi}">https://doi.org/${r.doi}</a></li>`).join('')}</ul>
    </div>`,
  );
}

/** Opens the researchers' block and scrolls to a paragraph in it. */
export function linkTags(root: HTMLElement): void {
  const targets: Record<string, string> = { clip: 'about-inferred', assumption: 'about-inferred', project: 'about-target', paper: 'references' };
  for (const tag of root.querySelectorAll<HTMLElement>('.tag[data-tag]')) {
    const id = targets[tag.dataset.tag!];
    if (!id) continue;
    const link = document.createElement('a');
    link.className = tag.className;
    link.dataset.tag = tag.dataset.tag;
    link.href = `#${id}`;
    link.textContent = tag.textContent;
    link.title = tag.dataset.tag === 'paper' ? 'Reported in the paper' : 'Explained under For researchers';
    link.addEventListener('click', () => {
      const details = document.querySelector<HTMLDetailsElement>('#researchers');
      if (details && id !== 'references') details.open = true;
    });
    tag.replaceWith(link);
  }
}

export function renderAbout(container: HTMLElement): void {
  container.innerHTML = `${paragraphs(about.paragraphs)}
    <p>${about.licence} The source code is on <a href="${about.source}">GitHub</a>. Version ${__APP_VERSION__}.</p>`;
}
