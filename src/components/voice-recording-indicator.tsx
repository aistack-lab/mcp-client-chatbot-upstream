"use client";

import { useEffect, useState } from "react";
import { cn } from "lib/utils";
import { X } from "lucide-react";

interface VoiceRecordingIndicatorProps {
  isRecording: boolean;
  duration?: number; // Max duration in seconds
  className?: string;
  onMaxDurationReached?: () => void;
  onCancel?: () => void;
}

export const VoiceRecordingIndicator = ({
  isRecording,
  duration = 30, // Default 30 seconds max
  className,
  onMaxDurationReached,
  onCancel,
}: VoiceRecordingIndicatorProps) => {
  const [timer, setTimer] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      setTimer(0);
      setProgress(0);
      
      interval = setInterval(() => {
        setTimer((prev) => {
          const newValue = prev + 1;
          
          // Calculate progress percentage
          const progressPercentage = (newValue / duration) * 100;
          setProgress(progressPercentage);
          
          // Check if max duration reached
          if (newValue >= duration && onMaxDurationReached) {
            onMaxDurationReached();
            clearInterval(interval);
          }
          
          return newValue;
        });
      }, 1000);
    } else {
      setTimer(0);
      setProgress(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, duration, onMaxDurationReached]);

  if (!isRecording) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Recording pulse animation */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-3 h-3 bg-red-500 rounded-full" />
        <div className="absolute w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
      </div>
      
      {/* Timer */}
      <span className="text-sm font-medium text-muted-foreground">
        {formatTime(timer)}
      </span>
      
      {/* Progress bar */}
      <div className="relative h-1 w-16 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-red-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Cancel button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="p-1 rounded-full hover:bg-muted/80 transition-colors"
          title="Cancel recording"
        >
          <X className="size-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
};