import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioUrl, 
  duration, 
  className = '' 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      console.log('Audio metadata loaded:', audioUrl);
      setAudioDuration(audio.duration);
      setIsLoading(false);
    };

    const handleLoadedData = () => {
      console.log('Audio data loaded:', audioUrl);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: any) => {
      console.error('Audio error:', e, audioUrl);
      setError('Error al cargar el audio');
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      console.log('Audio can play:', audioUrl);
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Load the audio
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Error al reproducir el audio');
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (parseFloat(e.target.value) / 100) * audioDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  if (error) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 ${className}`}>
        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
          <Volume2 className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 bg-background/50 rounded-lg border ${className}`}>
      <audio ref={audioRef} preload="metadata">
        <source src={audioUrl} type="audio/ogg" />
        <source src={audioUrl} type="audio/mpeg" />
        <source src={audioUrl} type="audio/wav" />
        Tu navegador no soporta la reproducción de audio
      </audio>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlayPause}
        disabled={isLoading}
        className="w-10 h-10 rounded-full bg-primary/20 hover:bg-primary/30 p-0"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5 text-primary" />
        ) : (
          <Play className="w-5 h-5 text-primary ml-0.5" />
        )}
      </Button>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            value={audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}
            onChange={handleSeek}
            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            disabled={isLoading || audioDuration === 0}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <Volume2 className="w-4 h-4" />
      </div>
    </div>
  );
};