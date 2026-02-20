import { useRef, useState, useCallback } from 'react';
import type { ConversionProgress } from '../utils/ffmpegConverter';

export type ExportFormat = 'webm' | 'mp4';

export function useVideoRecorder(canvas: HTMLCanvasElement | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const startRecording = useCallback(async () => {
    if (!canvas) {
      alert('Canvas not available');
      return;
    }

    try {
      // Capture canvas stream
      const stream = canvas.captureStream(30); // 30 FPS
      streamRef.current = stream;

      // Try different mime types for better compatibility
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunksRef.current, { type: mimeType });
        const timestamp = Date.now();

        if (exportFormat === 'mp4') {
          try {
            setIsConverting(true);
            setConversionProgress({ phase: 'loading', progress: 0 });

            // Dynamically import ffmpeg converter
            const { convertWebMToMP4 } = await import('../utils/ffmpegConverter');
            const mp4Blob = await convertWebMToMP4(webmBlob, setConversionProgress);
            downloadBlob(mp4Blob, `afl-scenario-${timestamp}.mp4`);
          } catch (error) {
            console.error('MP4 conversion failed, falling back to WebM:', error);
            // Fall back to WebM download
            downloadBlob(webmBlob, `afl-scenario-${timestamp}.webm`);
            alert('MP4 conversion failed. Video saved as WebM instead.');
          } finally {
            setIsConverting(false);
            setConversionProgress(null);
          }
        } else {
          downloadBlob(webmBlob, `afl-scenario-${timestamp}.webm`);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please check browser compatibility.');
    }
  }, [canvas, exportFormat, downloadBlob]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isConverting,
    conversionProgress,
    exportFormat,
    setExportFormat,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
