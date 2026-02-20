import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Playbook } from '../store/playbookStore';

const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB

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

export async function sharePlaybook(
  playbook: Playbook,
  videoBlob?: Blob,
  expiryDays?: number
): Promise<{ token: string; url: string } | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const token = generateToken();
  let videoUrl: string | null = null;

  // Upload video if provided and under size limit
  if (videoBlob && videoBlob.size <= MAX_VIDEO_SIZE) {
    const videoPath = `shared/${token}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('shared-videos')
      .upload(videoPath, videoBlob, { contentType: 'video/mp4' });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('shared-videos')
        .getPublicUrl(videoPath);
      videoUrl = urlData.publicUrl;
    } else {
      console.error('Video upload failed:', uploadError);
    }
  }

  const expiresAt = expiryDays
    ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from('shared_playbooks').insert({
    token,
    playbook_data: {
      name: playbook.name,
      description: playbook.description,
      playerPositions: playbook.playerPositions,
      cameraPosition: playbook.cameraPosition,
      cameraTarget: playbook.cameraTarget,
      cameraZoom: playbook.cameraZoom,
    },
    video_url: videoUrl,
    expires_at: expiresAt,
  });

  if (error) {
    console.error('Error sharing playbook:', error);
    return null;
  }

  const url = `${window.location.origin}/shared/${token}`;
  return { token, url };
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
