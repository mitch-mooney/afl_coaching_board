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
 * Share a scenario that has a linked video moment.
 * Extracts the clip via FFmpeg WASM, uploads to Supabase Storage,
 * and creates a shared_playbooks record with video_url.
 *
 * Returns null if Supabase is not configured or on error.
 * Caller provides the raw video blob (the full source video).
 */
export async function shareScenarioWithClip(
  scenarioId: number,
  videoBlob: Blob,
  onProgress?: (phase: string, progress: number) => void
): Promise<{ token: string; url: string; clipTooLarge?: boolean } | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  // Look up the scenario
  const scenario = await playbookDB.scenarios.get(scenarioId);
  if (!scenario) return null;

  const lvm = scenario.linkedVideoMoment;
  if (!lvm) return null;

  // Use first phase for playbook_data
  const phase = scenario.phases?.[0];
  if (!phase) return null;

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
    console.error('[shareScenarioWithClip] FFmpeg extraction failed', err);
    return null;
  }

  // Size guard — return early with clipTooLarge flag
  if (clipBlob.size > MAX_SHARE_VIDEO_SIZE) {
    return { token: '', url: '', clipTooLarge: true };
  }

  onProgress?.('Uploading…', 0.8);

  const token = generateToken();
  let videoUrl: string | null = null;

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
    console.error('[shareScenarioWithClip] upload failed', uploadError);
    // Continue without video — still share the board diagram
  }

  onProgress?.('Saving share link…', 0.95);

  const { error } = await supabase.from('shared_playbooks').insert({
    token,
    playbook_data: {
      name: scenario.name,
      playerPositions: phase.playerPositions,
      paths: phase.paths,
      annotations: phase.annotations ?? [],
      cameraPosition: phase.cameraState?.position ?? null,
      cameraTarget: phase.cameraState?.target ?? null,
      cameraZoom: phase.cameraState?.zoom ?? 1,
      quarter: lvm.quarter ?? null,
      label: lvm.label ?? null,
    },
    video_url: videoUrl,
    expires_at: null,
  });

  if (error) {
    console.error('[shareScenarioWithClip] insert failed', error);
    return null;
  }

  onProgress?.('Done', 1);

  const url = `${window.location.origin}/shared/${token}`;
  return { token, url };
}
