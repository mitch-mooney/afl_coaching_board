import { useEffect, useMemo, useState } from 'react';
import { useVenueStore } from '../../store/venueStore';
import {
  ADD_GROUND_LABEL,
  STANDARD_GROUND_IS_GENERIC,
  validateBoundaryDimensions,
} from '../../models/VenueModel';
import type { Venue } from '../../models/VenueModel';
import { useOverlayOpen } from '../../hooks/useOverlayOpen';
import {
  dialogBody,
  dialogButton,
  dialogChipButton,
  dialogError,
  dialogField,
  dialogFooterButton,
  dialogHeader,
  dialogHint,
  dialogLabel,
  dialogLayer,
  dialogLit,
  dialogPanelScroll,
  dialogPrimaryButton,
  dialogScrim,
  dialogTitle,
} from './dialogStyles';

interface DraftForm {
  id: number | null; // null = creating
  name: string;
  boundaryLength: string;
  boundaryWidth: string;
}

const EMPTY_DRAFT: DraftForm = { id: null, name: '', boundaryLength: '', boundaryWidth: '' };

/**
 * The coach's library of grounds: add, edit, delete, and set which one the board
 * renders on — adding one also sets it, in `venueStore`, so a coach who records
 * Saturday's ground need not then hunt for the row they just made (issue #49).
 * Lives in the Match section of the global drawer because Match is
 * where the fixture's fixed facts are configured — teams, score, ground. The
 * drawer item names none of them: it is a route to this panel, not a surface
 * that asserts match context. Which ground is current is reported live by the
 * board's ground chip — not by the door to here.
 *
 * **This panel makes no claim about the open board's fit, in any part** — no
 * count, no sentence, no Pull inside boundary. Its fit banner left in issue #52,
 * in the same change that put the Fit readout in the chip's popover, where the
 * coach is actually looking; neither half could ship alone, because removing the
 * banner first would leave the app with no Fit readout at all. That exclusion is
 * the thing that stops the panel and the popover becoming two versions of the
 * same screen: they both set the Active Venue, and that is the only overlap
 * either is allowed.
 *
 * See docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md and
 * docs/adr/0005-the-fit-readout-lives-on-the-board.md.
 */
export function VenueModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useOverlayOpen(open);
  const venues = useVenueStore((s) => s.venues);
  const activeVenueId = useVenueStore((s) => s.activeVenueId);
  const loadVenues = useVenueStore((s) => s.loadVenues);
  const createVenue = useVenueStore((s) => s.createVenue);
  const updateVenue = useVenueStore((s) => s.updateVenue);
  const deleteVenue = useVenueStore((s) => s.deleteVenue);
  const setActiveVenue = useVenueStore((s) => s.setActiveVenue);

  const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
  const [showForm, setShowForm] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    loadVenues();
    // The panel stays mounted when closed, so transient state has to be cleared
    // on the way in — otherwise it reopens showing a half-typed ground or a
    // "Sure?" button armed against a row the coach has since forgotten about.
    setDraft(EMPTY_DRAFT);
    setShowForm(false);
    setConfirmingDelete(null);
    setSaveError(null);
  }, [open, loadVenues]);

  // Live validation as the coach types. An empty form is "not ready" rather than
  // invalid — we don't shout at someone who hasn't finished typing.
  const validation = useMemo(() => {
    const length = Number(draft.boundaryLength);
    const width = Number(draft.boundaryWidth);
    if (draft.boundaryLength.trim() === '' || draft.boundaryWidth.trim() === '') return null;
    return validateBoundaryDimensions({ boundaryLength: length, boundaryWidth: width });
  }, [draft.boundaryLength, draft.boundaryWidth]);

  const canSave =
    draft.name.trim() !== '' && validation !== null && validation.ok;

  if (!open) return null;

  const beginCreate = () => {
    setDraft(EMPTY_DRAFT);
    setSaveError(null);
    setShowForm(true);
  };

  const beginEdit = (venue: Venue) => {
    setDraft({
      id: venue.id ?? null,
      name: venue.name,
      boundaryLength: String(venue.boundaryLength),
      boundaryWidth: String(venue.boundaryWidth),
    });
    setSaveError(null);
    setShowForm(true);
  };

  const save = async () => {
    const dimensions = {
      boundaryLength: Number(draft.boundaryLength),
      boundaryWidth: Number(draft.boundaryWidth),
    };
    try {
      if (draft.id === null) {
        await createVenue({ name: draft.name.trim(), ...dimensions });
      } else {
        await updateVenue(draft.id, { name: draft.name.trim(), ...dimensions });
      }
      setShowForm(false);
      setDraft(EMPTY_DRAFT);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save that ground.');
    }
  };

  return (
    <div className={dialogLayer}>
      <div className={dialogScrim} onClick={onClose} />
      <div className={`${dialogPanelScroll} max-w-md`}>
        <div className={dialogHeader}>
          <span className={dialogTitle}>Grounds</span>
          <p className={`${dialogHint} mt-xxs`}>
            The ground every play is drawn on. Measure yours — no two community grounds are the same.
          </p>
        </div>

        <div className="p-md space-y-sm">
          {venues.map((venue) => {
            const isActive = venue.id === activeVenueId;
            return (
              <div
                key={venue.id}
                className={`border rounded-control p-sm ${isActive ? 'border-floodlight bg-steel/40' : 'border-steel'}`}
              >
                <div className="flex items-center gap-sm">
                  <button
                    onClick={() => venue.id != null && setActiveVenue(venue.id)}
                    className="flex-1 text-left min-h-[44px] touch-manipulation"
                  >
                    <div className="text-body font-semibold text-chalk">
                      {venue.name}
                      {isActive && <span className="ml-sm text-caption text-floodlight">· active</span>}
                    </div>
                    <div className={dialogHint}>
                      {venue.boundaryLength} × {venue.boundaryWidth} m
                      {/* Shared with the board's ground popover, which says the
                          same of the same row — see `VenueModel`. */}
                      {venue.isDefault && ` · ${STANDARD_GROUND_IS_GENERIC}`}
                    </div>
                  </button>
                  {/* Standard ground is the generic fallback, not a measured ground.
                      Editing it would make the "generic" label below a lie — a coach
                      with a real ground adds their own. */}
                  {!venue.isDefault && (
                    <button
                      onClick={() => beginEdit(venue)}
                      className={dialogChipButton}
                    >
                      Edit
                    </button>
                  )}
                  {!venue.isDefault && (
                    confirmingDelete === venue.id ? (
                      <button
                        onClick={async () => {
                          if (venue.id != null) await deleteVenue(venue.id);
                          setConfirmingDelete(null);
                        }}
                        className={`${dialogChipButton} ${dialogLit}`}
                      >
                        Sure?
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmingDelete(venue.id ?? null)}
                        className={dialogChipButton}
                      >
                        Delete
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}

          {!showForm && (
            <button
              onClick={beginCreate}
              className={`${dialogButton} w-full`}
            >
              {/* The popover's footer routes here saying this; one name for the
                  action, stated in `VenueModel`. */}
              {ADD_GROUND_LABEL}
            </button>
          )}

          {showForm && (
            <div className="border border-steel rounded-control p-md space-y-md">
              <div>
                <label className={dialogLabel}>Ground name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Jubilee Park"
                  className={dialogField}
                />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className={dialogLabel}>Length (m)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draft.boundaryLength}
                    onChange={(e) => setDraft({ ...draft, boundaryLength: e.target.value })}
                    placeholder="goal to goal"
                    className={dialogField}
                  />
                </div>
                <div>
                  <label className={dialogLabel}>Width (m)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draft.boundaryWidth}
                    onChange={(e) => setDraft({ ...draft, boundaryWidth: e.target.value })}
                    placeholder="wing to wing"
                    className={dialogField}
                  />
                </div>
              </div>

              {validation && !validation.ok && (
                <p className={dialogError}>{validation.error}</p>
              )}
              {validation && validation.ok && validation.warning && (
                <p className={dialogBody}>{validation.warning}</p>
              )}
              {saveError && <p className={dialogError}>{saveError}</p>}

              <div className="flex gap-sm">
                <button
                  onClick={save}
                  disabled={!canSave}
                  className={`${dialogPrimaryButton} flex-1`}
                >
                  {draft.id === null ? 'Add ground' : 'Save changes'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setSaveError(null); }}
                  className={dialogButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className={dialogFooterButton}
        >
          Close
        </button>
      </div>
    </div>
  );
}
