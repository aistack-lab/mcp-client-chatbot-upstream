import { useState, useRef, useCallback, useEffect } from "react";
import { openai } from "@ai-sdk/openai";
import { toast } from "sonner";
import { VoiceInputError, isAudioRecordingSupported } from "@/types/voice";
import { experimental_transcribe } from "ai";

interface UseVoiceInputOptions {
  maxDuration?: number; // in seconds
  language?: string;
  onTranscriptionComplete?: (text: string) => void;
  onError?: (error: VoiceInputError, message?: string) => void;
}

export function useVoiceInput({
  maxDuration = 60,
  language = "en",
  onTranscriptionComplete,
  onError,
}: UseVoiceInputOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if browser supports audio recording
  // Use useState and useEffect to avoid hydration mismatch
  const [isSupported, setIsSupported] = useState(false);
  
  useEffect(() => {
    setIsSupported(isAudioRecordingSupported());
  }, []);

  const startRecording = useCallback(async () => {
    // Re-check support at runtime to be safe
    if (!isAudioRecordingSupported()) {
      const errorMsg = "Your browser doesn't support audio recording";
      toast.error(errorMsg);
      onError?.(VoiceInputError.NOT_SUPPORTED, errorMsg);
      return false;
    }

    if (isRecording || isTranscribing) return false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp3",
      });
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Clear timer if it exists
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        setIsRecording(false);
        processAudio();
      };

      // Set a timer to automatically stop recording after maxDuration
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
        }
      }, maxDuration * 1000);

      // Start recording
      mediaRecorder.start(100); // Capture data in 100ms chunks
      setIsRecording(true);
      return true;
    } catch (error) {
      const isPermissionError =
        error instanceof Error && error.name === "NotAllowedError";
      const errorType = isPermissionError
        ? VoiceInputError.PERMISSION_DENIED
        : VoiceInputError.RECORDING_FAILED;
      const errorMsg = isPermissionError
        ? "Microphone access denied. Please allow access in your browser settings."
        : "Failed to start recording.";

      toast.error(errorMsg);
      onError?.(errorType, errorMsg);
      console.error("Error accessing microphone:", error);
      return false;
    }
  }, [isRecording, isTranscribing, isSupported, maxDuration, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      return true;
    }
    return false;
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Clear audio chunks so we don't process them
      audioChunksRef.current = [];
      
      // Clear the timer if it exists
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop all audio tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      
      setIsRecording(false);
      return true;
    }
    return false;
  }, [isRecording]);

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) return;

    try {
      setIsTranscribing(true);

      // Create audio blob and convert to array buffer
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp3";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Transcribe audio using Vercel AI SDK
      const result = await experimental_transcribe({
        model: openai.transcription("whisper-1"),
        audio: new Uint8Array(arrayBuffer),
        providerOptions: {
          openai: {
            language,
          },
        },
      });

      // Return transcribed text
      if (result.text) {
        onTranscriptionComplete?.(result.text);
        return result.text;
      } else {
        const errorMsg = "Could not transcribe audio. Please try again.";
        toast.error(errorMsg);
        onError?.(VoiceInputError.TRANSCRIPTION_FAILED, errorMsg);
        return null;
      }
    } catch (error) {
      const errorMsg = "Error processing audio. Please try again.";
      toast.error(errorMsg);
      onError?.(VoiceInputError.TRANSCRIPTION_FAILED, errorMsg);
      console.error("Error transcribing audio:", error);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  return {
    isRecording,
    isTranscribing,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}