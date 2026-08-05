import { useEffect, useMemo, useState } from 'react';
import { useVenueStore } from '../../store/venueStore';
import { validateBoundaryDimensions } from '../../models/VenueModel';
import type { Venue } from '../../models/VenueModel';
import { useOverlayOpen } from '../../hooks/useOverlayOpen';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-lg shadow-xl border border-gray-200 w-[420px] max-h-[80vh] overflow-y-auto">
        <div className="p-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Grounds</span>
          <p className="text-xs text-gray-500 mt-0.5">
            The ground every play is drawn on. Measure yours — no two community grounds are the same.
          </p>
        </div>

        <div className="p-3 space-y-2">
          {venues.map((venue) => {
            const isActive = venue.id === activeVenueId;
            return (
              <div
                key={venue.id}
                className={`border rounded p-2 ${isActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => venue.id != null && setActiveVenue(venue.id)}
                    className="flex-1 text-left min-h-[36px] touch-manipulation"
                  >
                    <div className="text-sm font-medium text-gray-800">
                      {venue.name}
                      {isActive && <span className="ml-2 text-xs text-indigo-600">· active</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {venue.boundaryLength} × {venue.boundaryWidth} m
                      {venue.isDefault && ' · generic, not a measured ground'}
                    </div>
                  </button>
                  {/* Standard ground is the generic fallback, not a measured ground.
                      Editing it would make the "generic" label below a lie — a coach
                      with a real ground adds their own. */}
                  {!venue.isDefault && (
                    <button
                      onClick={() => beginEdit(venue)}
                      className="px-2 py-1 min-h-[36px] text-xs border rounded text-gray-600 hover:bg-gray-50 touch-manipulation"
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
                        className="px-2 py-1 min-h-[36px] text-xs border border-red-300 rounded text-red-600 bg-red-50 touch-manipulation"
                      >
                        Sure?
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmingDelete(venue.id ?? null)}
                        className="px-2 py-1 min-h-[36px] text-xs border rounded text-gray-600 hover:bg-gray-50 touch-manipulation"
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
              className="w-full min-h-[40px] px-3 py-2 text-sm rounded border border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 touch-manipulation"
            >
              Add a ground
            </button>
          )}

          {showForm && (
            <div className="border border-gray-200 rounded p-3 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">Ground name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Jubilee Park"
                  className="w-full px-2 py-1.5 min-h-[36px] text-sm border rounded touch-manipulation"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600">Length (m)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draft.boundaryLength}
                    onChange={(e) => setDraft({ ...draft, boundaryLength: e.target.value })}
                    placeholder="goal to goal"
                    className="w-full px-2 py-1.5 min-h-[36px] text-sm border rounded touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600">Width (m)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draft.boundaryWidth}
                    onChange={(e) => setDraft({ ...draft, boundaryWidth: e.target.value })}
                    placeholder="wing to wing"
                    className="w-full px-2 py-1.5 min-h-[36px] text-sm border rounded touch-manipulation"
                  />
                </div>
              </div>

              {validation && !validation.ok && (
                <p className="text-xs text-red-600">{validation.error}</p>
              )}
              {validation && validation.ok && validation.warning && (
                <p className="text-xs text-amber-600">{validation.warning}</p>
              )}
              {saveError && <p className="text-xs text-red-600">{saveError}</p>}

              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={!canSave}
                  className="flex-1 min-h-[40px] px-3 py-2 text-sm rounded bg-indigo-500 text-white disabled:opacity-40 touch-manipulation"
                >
                  {draft.id === null ? 'Add ground' : 'Save changes'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setSaveError(null); }}
                  className="min-h-[40px] px-3 py-2 text-sm rounded border text-gray-600 touch-manipulation"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full min-h-[44px] px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 border-t border-gray-100 touch-manipulation"
        >
          Close
        </button>
      </div>
    </div>
  );
}
