import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Playbook } from '../store/playbookStore';

export interface CloudPlaybook {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  player_positions: any;
  camera_position: [number, number, number];
  camera_target: [number, number, number];
  camera_zoom: number;
  annotations: any[] | null;
  created_at: string;
  updated_at: string;
}

function toCloudFormat(playbook: Playbook): Omit<CloudPlaybook, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    name: playbook.name,
    description: playbook.description || null,
    player_positions: playbook.playerPositions,
    camera_position: playbook.cameraPosition,
    camera_target: playbook.cameraTarget,
    camera_zoom: playbook.cameraZoom,
    annotations: playbook.annotations || null,
  };
}

function fromCloudFormat(cloud: CloudPlaybook): Omit<Playbook, 'id'> {
  return {
    cloudId: cloud.id,
    name: cloud.name,
    description: cloud.description || undefined,
    createdAt: new Date(cloud.created_at),
    playerPositions: cloud.player_positions,
    cameraPosition: cloud.camera_position,
    cameraTarget: cloud.camera_target,
    cameraZoom: cloud.camera_zoom,
    annotations: cloud.annotations || undefined,
  };
}

export async function uploadPlaybook(playbook: Playbook): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from('playbooks')
    .insert(toCloudFormat(playbook))
    .select('id')
    .single();

  if (error) {
    console.error('Error uploading playbook:', error);
    return null;
  }

  return data.id;
}

export async function fetchCloudPlaybooks(): Promise<Omit<Playbook, 'id'>[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('playbooks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cloud playbooks:', error);
    return [];
  }

  return (data as CloudPlaybook[]).map(fromCloudFormat);
}

export async function deleteCloudPlaybook(cloudId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from('playbooks')
    .delete()
    .eq('id', cloudId);

  if (error) {
    console.error('Error deleting cloud playbook:', error);
    return false;
  }

  return true;
}
