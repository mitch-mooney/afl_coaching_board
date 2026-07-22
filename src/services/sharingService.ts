import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { playbookDB } from '../store/appDatabase';
import { trimAndConvertVideo } from '../utils/ffmpegConverter';

const MAX_SHARE_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB

export interface SharedPlaybook {
  id: string;
  token: string;
  playbook_data: any;
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

/**
 * Share a play, board-only or with a video clip.
 *
 * When the play has a `linkedVideoMoment` AND a `videoBlob` is supplied,
 * extracts the clip via FFmpeg WASM, uploads it to Supabase Storage, and
 * includes `video_url` in the shared_playbooks record. Otherwise the share
 * is board-only (`video_url: null`) — no extraction or upload happens.
 *
 * Returns null if Supabase is not configured, the play isn't found, the
 * play has no first phase, or on insert error.
 */
export async function sharePlay(
  playId: number,
  videoBlob?: Blob | null,
  onProgress?: (phase: string, progress: number) => void
): Promise<{ token: string; url: string; clipTooLarge?: boolean } | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  // Look up the play
  const play = await playbookDB.scenarios.get(playId);
  if (!play) return null;

  // Use first phase for playbook_data
  const phase = play.phases?.[0];
  if (!phase) return null;

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
      return null;
    }

    // Size guard — return early with clipTooLarge flag
    if (clipBlob.size > MAX_SHARE_VIDEO_SIZE) {
      return { token: '', url: '', clipTooLarge: true };
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

  const { error } = await supabase.from('shared_playbooks').insert({
    token,
    playbook_data: {
      name: play.name,
      playerPositions: phase.playerPositions,
      paths: phase.paths,
      annotations: phase.annotations ?? [],
      cameraPosition: phase.cameraState?.position ?? null,
      cameraTarget: phase.cameraState?.target ?? null,
      cameraZoom: phase.cameraState?.zoom ?? 1,
      quarter: lvm?.quarter ?? null,
      label: lvm?.label ?? null,
    },
    video_url: videoUrl,
    expires_at: null,
  });

  if (error) {
    console.error('[sharePlay] insert failed', error);
    return null;
  }

  onProgress?.('Done', 1);

  const url = `${window.location.origin}/shared/${token}`;
  return { token, url };
}
