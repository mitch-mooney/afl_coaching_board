/**
 * The dialogs' shared classes, built from the design tokens through the
 * Tailwind theme (`src/theme/tokens.ts`), so every modal is the same Concrete
 * panel edged in Steel with Chalk text. Nothing here names a colour of its own.
 *
 * Floodlight is the state colour here as on the board: a selected quarter,
 * the active ground, an armed delete. A dialog's primary action is a Chalk
 * fill rather than a colour, because there is no brand accent and the state
 * colour is not a call to action.
 *
 * The "doesn't fit" colour never appears in a dialog (ADR 0005): no dialog
 * shows the Fit readout, and `dialogPalette.test.ts` holds every dialog to it.
 *
 * Every class string is a full literal so Tailwind's scanner finds it.
 */

/** The fixed layer a dialog opens on. The padding is the gutter at phone width. */
export const dialogLayer = 'fixed inset-0 z-50 flex items-center justify-center p-lg';

/** The scrim behind a dialog: Concrete over the board. Tapping it closes. */
export const dialogScrim = 'absolute inset-0 bg-concrete/75 backdrop-blur-sm';

/**
 * The panel itself. Full width up to the size the caller adds (`max-w-*`), so
 * no dialog is wider than a phone.
 */
export const dialogPanel =
  'relative z-10 w-full bg-concrete text-chalk border border-steel rounded-panel shadow-2xl';

/** A panel whose content can outgrow the screen. */
export const dialogPanelScroll = `${dialogPanel} max-h-[80vh] overflow-y-auto`;

/** The ruled strip a dialog's title sits in. */
export const dialogHeader = 'p-md border-b border-steel';

/** A dialog's title, in the display face. */
export const dialogTitle = 'font-display text-title text-chalk';

/** A heading inside a dialog's body, above a group of rows or fields. */
export const dialogSubheading = 'text-label text-chalk/70';

/** Running text. */
export const dialogBody = 'text-body text-chalk/85';

/** A hint under a title or a field. */
export const dialogHint = 'text-caption text-chalk/60';

/** A field's label. */
export const dialogLabel = 'block text-label text-chalk mb-xs';

/** A text input, textarea or select. */
export const dialogField =
  'w-full px-md py-sm min-h-[44px] text-body bg-steel/40 text-chalk placeholder:text-chalk/40 border border-steel rounded-chip touch-manipulation';

/** A compact field: a score, a dimension. */
export const dialogFieldCompact =
  'px-sm py-xs min-h-[44px] text-body bg-steel/40 text-chalk placeholder:text-chalk/40 border border-steel rounded-chip touch-manipulation';

/**
 * An error. There is no error colour in the palette, so an error is Chalk at
 * full strength against the dimmer body text, with a Chalk rule beside it.
 */
export const dialogError = 'text-body font-semibold text-chalk border-l-2 border-chalk pl-sm';

const buttonBase =
  'px-lg py-sm min-h-[44px] text-label rounded-control touch-manipulation motion-safe:transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

/** The action a dialog exists for: Save, Import, Create share link. */
export const dialogPrimaryButton = `${buttonBase} bg-chalk text-concrete hover:bg-chalk/85`;

/** Every other action: Cancel, Back, Parse. */
export const dialogButton = `${buttonBase} bg-steel text-chalk hover:bg-steel/70`;

/** The full-width Close or Cancel row along a panel's foot. */
export const dialogFooterButton =
  'w-full min-h-[44px] px-md py-sm text-label text-chalk/75 hover:bg-steel/50 border-t border-steel touch-manipulation motion-safe:transition-colors';

/** A tappable row in a list: a player, a ground. */
export const dialogRow = 'hover:bg-steel/50 touch-manipulation motion-safe:transition-colors';

/** A control in its lit state: the selected quarter, an armed confirm. */
export const dialogLit = 'bg-floodlight text-concrete border-floodlight';

/** A small bordered button beside a row: Edit, Delete. */
export const dialogChipButton =
  'px-sm py-xs min-h-[44px] text-label border border-steel rounded-chip text-chalk/85 hover:bg-steel/50 touch-manipulation motion-safe:transition-colors';
