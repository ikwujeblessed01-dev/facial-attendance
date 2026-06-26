"use client";

import { useRef, useEffect, useState } from "react";
import { Camera, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

interface WebcamScannerProps {
  onCapture: (base64Image: string) => void;
  isScanning: boolean;
  scanStatus?: string;
  scanSuccess?: boolean | null;
}

// Simple synthesizer for audio feedback
export const playSynthSound = (type: "scan" | "success" | "error") => {
  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === "scan") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Ignore audio errors
  }
};

export default function WebcamScanner({
  onCapture,
  isScanning,
  scanStatus,
  scanSuccess,
}: WebcamScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setError("");
      } catch (err) {
        setError(
          "Camera access denied or unavailable. Please allow camera permissions."
        );
      }
    }

    setupCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCaptureClick = () => {
    if (isScanning || countdown !== null) return;
    
    // Start countdown
    setCountdown(3);
    playSynthSound("scan");
    
    let counter = 3;
    const interval = setInterval(() => {
      counter -= 1;
      if (counter > 0) {
        setCountdown(counter);
        playSynthSound("scan");
      } else {
        clearInterval(interval);
        setCountdown(null);
        executeCapture();
      }
    }, 800);
  };

  const executeCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw the video frame to the canvas
        // Mirror it so it matches what the user sees
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const base64Image = canvas.toDataURL("image/jpeg", 0.8);
        onCapture(base64Image);
      }
    }
  };

  // Sound effects on status change
  useEffect(() => {
    if (scanSuccess === true) {
      playSynthSound("success");
    } else if (scanSuccess === false) {
      playSynthSound("error");
    }
  }, [scanSuccess]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {error ? (
        <div className="w-full flex flex-col items-center justify-center p-8 text-red-500 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/50 animate-fade-in text-center">
          <AlertTriangle className="h-10 w-10 mb-3" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : (
        <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-950 shadow-2xl ring-1 ring-zinc-200 dark:ring-zinc-800">
          {/* Main Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ${
              isScanning ? "opacity-30 blur-sm grayscale" : "opacity-100"
            }`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* HUD Overlay - Cyberpunk styled */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner Brackets */}
            <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-blue-500/50 rounded-tl-xl transition-all duration-300"></div>
            <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-blue-500/50 rounded-tr-xl transition-all duration-300"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-blue-500/50 rounded-bl-xl transition-all duration-300"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-blue-500/50 rounded-br-xl transition-all duration-300"></div>

            {/* Crosshair Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-32 h-40 border border-blue-400/30 rounded-[100%] shadow-[0_0_15px_rgba(59,130,246,0.2)]"></div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500/80 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]"></div>

            {/* Scanning Scanline Animation */}
            {isScanning && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-[slide-up_2s_ease-in-out_infinite_alternate]"></div>
            )}
            
            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                <span className="text-8xl font-black text-white drop-shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-pulse">
                  {countdown}
                </span>
              </div>
            )}

            {/* Status Overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-max max-w-[90%] bg-zinc-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full border border-zinc-700/50 shadow-lg flex items-center gap-2">
              {isScanning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                  <span className="text-xs font-mono font-medium tracking-wide">
                    {scanStatus || "Analyzing..."}
                  </span>
                </>
              ) : scanSuccess === true ? (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-mono font-medium tracking-wide text-emerald-400">
                    Match Found
                  </span>
                </>
              ) : scanSuccess === false ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-xs font-mono font-medium tracking-wide text-red-400">
                    Verification Failed
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping mr-1"></span>
                  <span className="text-xs font-mono font-medium tracking-wide">
                    Camera Active
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {!error && (
        <button
          onClick={handleCaptureClick}
          disabled={isScanning || countdown !== null}
          className="mt-6 group relative flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900 transition-all duration-300 shadow-xl border-4 border-zinc-200 dark:bg-white dark:hover:bg-zinc-100 dark:border-zinc-800 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
        >
          <div
            className={`absolute inset-0 rounded-full bg-blue-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 ${
              isScanning ? "animate-ping opacity-30" : ""
            }`}
          />
          <Camera
            className={`h-6 w-6 text-white dark:text-zinc-900 ${
              isScanning || countdown !== null ? "animate-pulse" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
}
