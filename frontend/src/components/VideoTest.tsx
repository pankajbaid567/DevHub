import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const VideoTest: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startVideo = async () => {
    try {
      console.log('🎥 Starting video test...');
      setError(null);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
      
      console.log('✅ Got media stream:', stream);
      console.log('📹 Video tracks:', stream.getVideoTracks());
      console.log('🎤 Audio tracks:', stream.getAudioTracks());
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log('Video play error:', e));
        console.log('✅ Video element set up');
        setIsStreaming(true);
      } else {
        console.log('❌ Video ref not found');
        setError('Video element not found');
      }
    } catch (err) {
      console.error('❌ Error accessing camera:', err);
      setError(`Camera access failed: ${err.message}`);
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      console.log('🛑 Video stopped');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Video Test</h1>
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={startVideo} disabled={isStreaming}>
                Start Video
              </Button>
              <Button onClick={stopVideo} disabled={!isStreaming} variant="destructive">
                Stop Video
              </Button>
            </div>
            
            {error && (
              <div className="text-red-500 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
            
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-64 object-cover"
                style={{ backgroundColor: '#000' }}
              />
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Status: {isStreaming ? 'Streaming' : 'Not streaming'}</p>
              <p>This test verifies basic camera access and video display.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoTest;
