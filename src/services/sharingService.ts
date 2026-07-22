import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { usePlayStore } from '../store/playStore';
import { trimAndConvertVideo } from '../utils/ffmpegConverter';
import { toShareData, fromPhase } from '../utils/boardSnapshot';
import type { SharePayload } from '../utils/boardSnapshot';

const MAX_SHARE_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB

export interface SharedPlaybook {
  id: string;
  token: string;
  playbook_data: SharePayload;
  video_url: string | null;
  expires_at: string | null;
  created_at: string;
  creator_email: string | null;
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export async function getSharedPlaybook(token: string): Promise<SharedPlaybook | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from('shared_playbooks')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) {
    console.error('Error fetching shared playbook:', error);
    return null;
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  return data as SharedPlaybook;
}

/** Why a share could not be created, so the UI can explain it precisely. */
export type ShareFailReason = 'not-configured' | 'not-found' | 'no-content' | 'failed';

/**
 * Result of a share attempt: the link on success, a size flag when the clip
 * was too large, or a typed reason when it could not be created.
 */
export type ShareResult =
  | { token: string; url: string }
  | { clipTooLarge: true }
  | { reason: ShareFailReason };

/**
 * Share a play, board-only or with a video clip.
 *
 * When the play has a `linkedVideoMoment` AND a `videoBlob` is supplied,
 * extracts the clip via FFmpeg WASM, uploads it to Supabase Storage, and
 * includes `video_url` in the shared_playbooks record. Otherwise the share
 * is board-only (`video_url: null`) — no extraction or upload happens.
 *
 * On failure returns a typed `reason`: 'not-configured' (Supabase off),
 * 'not-found' (play missing), 'no-content' (play has no saved phase yet —
 * arrange and save it first), or 'failed' (extraction/upload/insert error).
 */
export async function sharePlay(
  playId: number,
  videoBlob?: Blob | null,
  onProgress?: (phase: string, progress: number) => void
): Promise<ShareResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { reason: 'not-configured' };
  }

  // Look up the play through the playStore gateway
  const play = await usePlayStore.getState().getPlay(playId);
  if (!play) return { reason: 'not-found' };

  // Use first phase for playbook_data — absent until the play is arranged + saved
  const phase = play.phases?.[0];
  if (!phase) return { reason: 'no-content' };

  const lvm = play.linkedVideoMoment;
  const token = generateToken();
  let videoUrl: string | null = null;

  if (lvm && videoBlob) {
    onProgress?.('Extracting clip…', 0);

    // Extract clip via FFmpeg WASM
    let clipBlob: Blob;
    try {
      const result = await trimAndConvertVideo(
        videoBlob,
        lvm.startTime,
        lvm.endTime,
        ({ phase: p, progress }) => {
          onProgress?.(p === 'loading' ? 'Loading FFmpeg…' : 'Extracting clip…', progress);
        }
      );
      clipBlob = result.blob;
    } catch (err) {
      console.error('[sharePlay] FFmpeg extraction failed', err);
      return { reason: 'failed' };
    }

    // Size guard — return early with clipTooLarge flag
    if (clipBlob.size > MAX_SHARE_VIDEO_SIZE) {
      return { clipTooLarge: true };
    }

    onProgress?.('Uploading…', 0.8);

    // Upload clip to shared-videos bucket
    const videoPath = `shared/${token}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('shared-videos')
      .upload(videoPath, clipBlob, { contentType: 'video/mp4' });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('shared-videos')
        .getPublicUrl(videoPath);
      videoUrl = urlData.publicUrl;
    } else {
      console.error('[sharePlay] upload failed', uploadError);
      // Continue without video — still share the board diagram
    }
  }

  onProgress?.('Saving share link…', 0.95);

  const playbookData: SharePayload = toShareData(fromPhase(phase), {
    name: play.name,
    quarter: lvm?.quarter ?? null,
    label: lvm?.label ?? null,
  });

  const { error } = await supabase.from('shared_playbooks').insert({
    token,
    playbook_data: playbookData,
    video_url: videoUrl,
    expires_at: null,
  });

  if (error) {
    console.error('[sharePlay] insert failed', error);
    return { reason: 'failed' };
  }

  onProgress?.('Done', 1);

  const url = `${window.location.origin}/shared/${token}`;
  return { token, url };
}
