import { describe, expect, it } from 'vitest';
import { tabletopMarkup } from './tabletop-markup.js';

describe('V22 approved comic phone-chain hook', () => {
  it('ships a responsive original-art picture as an accessible direct unlock-game entry', () => {
    const markup = tabletopMarkup();

    expect(markup).toContain('data-home-hook');
    expect(markup).toContain('aria-label="Play to unlock a charm"');
    expect(markup).not.toContain('aria-label="Make your phone chain"');
    expect(markup).not.toContain('Make yours');
    expect(markup).toContain('/assets/home-hook-comic-v22.webp');
    expect(markup).toContain('/assets/home-hook-comic-v22.png');
    expect(markup).toContain('home-drop-ring');
  });

  it('keeps the approved hook separate from gameplay canvas semantics', () => {
    const markup = tabletopMarkup();
    const hook = markup.slice(markup.indexOf('data-home-hook'), markup.indexOf('</button>', markup.indexOf('data-home-hook')));

    expect(hook).toContain('alt="A blue and pearl phone chain');
    expect(hook).not.toContain('data-paint');
  });
});
