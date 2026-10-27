/** Accessible tabs: click or arrow keys switch panels; onChange receives the selected tab's id. */
export function mountTabs(tablist: HTMLElement, onChange?: (id: string) => void): void {
  const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));

  const activate = (tab: HTMLButtonElement, focus = false) => {
    for (const other of tabs) {
      const selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')!)!.hidden = !selected;
    }
    if (focus) tab.focus();
    onChange?.(tab.id);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      activate(tabs[(index + step + tabs.length) % tabs.length], true);
    });
  });
}
