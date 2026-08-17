/**
 * As quatro manuscritas ficam self-hosted (@fontsource), como o Oswald: sem CDN,
 * carrega offline e não quebra se o Google cair. Só o subconjunto `latin`, que
 * já cobre ç/ã/é — `latin-ext` dobraria o peso sem uso.
 */
import '@fontsource/kalam/latin-400.css';
import '@fontsource/kalam/latin-700.css';
import '@fontsource/caveat/latin-400.css';
import '@fontsource/caveat/latin-700.css';
import '@fontsource/architects-daughter/latin-400.css';
import '@fontsource/patrick-hand/latin-400.css';

export type HandwritingFont = 'kalam' | 'caveat' | 'architects' | 'patrick';

export const DEFAULT_FONT: HandwritingFont = 'kalam';

export const FONTS: Array<{ id: HandwritingFont; label: string; stack: string; bold: boolean }> = [
  { id: 'kalam', label: 'Kalam', stack: "'Kalam', cursive", bold: true },
  { id: 'caveat', label: 'Caveat', stack: "'Caveat', cursive", bold: true },
  { id: 'architects', label: 'Architects', stack: "'Architects Daughter', cursive", bold: false },
  { id: 'patrick', label: 'Patrick Hand', stack: "'Patrick Hand', cursive", bold: false },
];

const BY_ID = new Map(FONTS.map((f) => [f.id, f]));

export const fontStack = (id: HandwritingFont): string =>
  (BY_ID.get(id) ?? BY_ID.get(DEFAULT_FONT)!).stack;

/**
 * Duas das quatro famílias têm um peso só. Pedir 700 nelas faria o browser
 * sintetizar um negrito engrossando o traço — fica borrado. Nessas, o título se
 * distingue pelo tamanho, não pelo peso.
 */
export const titleWeight = (id: HandwritingFont): number =>
  (BY_ID.get(id) ?? BY_ID.get(DEFAULT_FONT)!).bold ? 700 : 400;
