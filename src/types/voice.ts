// Types for voice input functionality
export interface VoiceRecordingState {
  isRecording: boolean;
  isTranscribing: boolean;
  duration: number;
  audioBlob?: Blob;
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    startSecond: number;
    endSecond: number;
  }>;
  language?: string;
  durationInSeconds?: number;
}

export interface TranscriptionOptions {
  language?: string;
  temperature?: number;
  timestampGranularities?: Array<'segment' | 'word'>;
}

export enum VoiceInputError {
  PERMISSION_DENIED = 'permission_denied',
  NOT_SUPPORTED = 'not_supported',
  TRANSCRIPTION_FAILED = 'transcription_failed',
  RECORDING_FAILED = 'recording_failed',
}

export const isAudioRecordingSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof navigator === 'undefined') return false;
  if (!navigator.mediaDevices) return false;
  return !!navigator.mediaDevices.getUserMedia;
};