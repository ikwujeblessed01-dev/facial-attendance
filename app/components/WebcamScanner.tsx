"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, AlertCircle } from "lucide-react";

interface WebcamScannerProps {
  onCapture: (base64Image: string) => void;
  isScanning: boolean;
  scanStatus?: string;
  scanSuccess?: boolean | null;
}

export function playSynthSound(type: "scan" | "success" | "error") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "scan") {
      // Cyber scanning sweep
      osc.type = "sine";
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "success") {
      // Pleasant victory chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24); // C6
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === "error") {
      // Double error buzzer
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);

      // Second beep
      setTimeout(() => {
        try {
          const ctx2 = new AudioContextClass();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.type = "sawtooth";
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.frequency.setValueAtTime(110, ctx2.currentTime);
          gain2.gain.setValueAtTime(0.12, ctx2.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.3);
          osc2.start();
          osc2.stop(ctx2.currentTime + 0.3);
        } catch {}
      }, 150);
    }
  } catch (error) {
    console.warn("Audio feedback context blocked or failed to initialize:", error);
  }
}

export default function WebcamScanner({
  onCapture,
  isScanning,
  scanStatus = "",
  scanSuccess = null,
}: WebcamScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Start webcam
  const startCamera = async () => {
    setErrorMsg("");
    setHasPermission(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      
      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      setErrorMsg(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Please enable camera access in your browser settings."
          : "Could not access camera. Make sure no other application is using it."
      );
    }
  };

  useEffect(() => {
    startCamera();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Play audio triggers based on success
  useEffect(() => {
    if (scanSuccess === true) {
      playSynthSound("success");
    } else if (scanSuccess === false) {
      playSynthSound("error");
    }
  }, [scanSuccess]);

  // Draw overlay effect in animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let laserY = 50;
    let laserDirection = 1;
    
    // Generate static mesh nodes with small offsets to simulate micro-tracking jitter
    const meshPoints = [
      { x: 0.5, y: 0.3, ox: 0, oy: 0 }, // Forehead top
      { x: 0.35, y: 0.45, ox: 0, oy: 0 }, // Left eye
      { x: 0.65, y: 0.45, ox: 0, oy: 0 }, // Right eye
      { x: 0.5, y: 0.52, ox: 0, oy: 0 }, // Nose bridge
      { x: 0.5, y: 0.62, ox: 0, oy: 0 }, // Nose tip
      { x: 0.4, y: 0.72, ox: 0, oy: 0 }, // Left mouth corner
      { x: 0.6, y: 0.72, ox: 0, oy: 0 }, // Right mouth corner
      { x: 0.5, y: 0.78, ox: 0, oy: 0 }, // Chin
      { x: 0.22, y: 0.5, ox: 0, oy: 0 }, // Left cheek outer
      { x: 0.78, y: 0.5, ox: 0, oy: 0 }, // Right cheek outer
      { x: 0.3, y: 0.68, ox: 0, oy: 0 }, // Left jaw
      { x: 0.7, y: 0.68, ox: 0, oy: 0 }, // Right jaw
    ];

    // Mesh connections to draw wireframe
    const meshConnections = [
      [0, 1], [0, 2], [1, 2], [1, 3], [2, 3],
      [1, 8], [2, 9], [3, 4], [4, 5], [4, 6],
      [5, 6], [5, 7], [6, 7], [8, 10], [9, 11],
      [10, 7], [11, 7], [4, 10], [4, 11]
    ];

    const drawScanner = () => {
      if (!canvas || !ctx) return;
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Define face guide box coordinates
      const boxW = width * 0.55;
      const boxH = height * 0.65;
      const boxX = (width - boxW) / 2;
      const boxY = (height - boxH) / 2;

      // Glow color selection
      let primaryColor = "rgba(16, 185, 129, "; // emerald
      let secondaryColor = "rgba(59, 130, 246, "; // blue
      let accentColor = "#3b82f6"; // blue-500
      
      if (isScanning) {
        primaryColor = "rgba(59, 130, 246, "; // blue-500 pulsing
        secondaryColor = "rgba(16, 185, 129, "; // emerald
        accentColor = "#60a5fa";
      }
      
      if (scanSuccess === true) {
        primaryColor = "rgba(16, 185, 129, "; // steady emerald
        secondaryColor = "rgba(16, 185, 129, ";
        accentColor = "#10b981";
      } else if (scanSuccess === false) {
        primaryColor = "rgba(239, 68, 68, "; // red
        secondaryColor = "rgba(239, 68, 68, ";
        accentColor = "#ef4444";
      }

      // Draw scanner bounding corners
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      const cornerLen = 24;

      // Top Left Corner
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + cornerLen);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + cornerLen, boxY);
      ctx.stroke();

      // Top Right Corner
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cornerLen, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + cornerLen);
      ctx.stroke();

      // Bottom Left Corner
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxH - cornerLen);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX + cornerLen, boxY + boxH);
      ctx.stroke();

      // Bottom Right Corner
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cornerLen, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH - cornerLen);
      ctx.stroke();

      // Draw faint boundary box
      ctx.strokeStyle = isScanning ? primaryColor + "0.35)" : "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Draw scanning laser line
      if (isScanning && scanSuccess === null) {
        laserY += 3.5 * laserDirection;
        if (laserY >= boxY + boxH - 5 || laserY <= boxY + 5) {
          laserDirection *= -1;
          playSynthSound("scan");
        }

        // Draw laser beam line
        const grad = ctx.createLinearGradient(boxX, laserY, boxX + boxW, laserY);
        grad.addColorStop(0, primaryColor + "0.01)");
        grad.addColorStop(0.5, primaryColor + "0.85)");
        grad.addColorStop(1, primaryColor + "0.01)");

        ctx.strokeStyle = grad;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(boxX, laserY);
        ctx.lineTo(boxX + boxW, laserY);
        ctx.stroke();

        // Laser glow panel
        ctx.fillStyle = primaryColor + "0.04)";
        if (laserDirection === 1) {
          ctx.fillRect(boxX, boxY, boxW, laserY - boxY);
        } else {
          ctx.fillRect(boxX, laserY, boxW, boxY + boxH - laserY);
        }
      }

      // Draw simulated biometric mesh
      if (isScanning || scanSuccess !== null) {
        const time = Date.now() * 0.003;
        
        // Update nodes with organic tracking noise
        const computedPoints = meshPoints.map((pt) => {
          const jitterX = Math.sin(time + pt.x * 10) * 4;
          const jitterY = Math.cos(time + pt.y * 10) * 4;
          
          return {
            x: boxX + boxW * pt.x + jitterX,
            y: boxY + boxH * pt.y + jitterY,
          };
        });

        // Draw lines
        ctx.strokeStyle = primaryColor + "0.4)";
        ctx.lineWidth = 1;
        meshConnections.forEach(([i, j]) => {
          const ptA = computedPoints[i];
          const ptB = computedPoints[j];
          ctx.beginPath();
          ctx.moveTo(ptA.x, ptA.y);
          ctx.lineTo(ptB.x, ptB.y);
          ctx.stroke();
        });

        // Draw node dots
        computedPoints.forEach((pt) => {
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
          ctx.fill();

          // Outer pulsing ring for key nodes
          ctx.strokeStyle = primaryColor + "0.7)";
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5 + Math.sin(time) * 2, 0, Math.PI * 2);
          ctx.stroke();
        });
      } else {
        // Just draw a faint face contour template
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.ellipse(
          width / 2,
          height / 2,
          boxW * 0.45,
          boxH * 0.45,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Display scanning telemetry in corners (cyberpunk tech style)
      if (isScanning) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "10px monospace";
        
        ctx.fillText("SYS.STATUS: SCANNING_FACE", boxX + 6, boxY + 16);
        ctx.fillText(`BIOMETRIC_LOCK: TRUE`, boxX + 6, boxY + 28);
        
        // Random Hex code strings mimicking calculations
        const rndHex = Math.random().toString(16).substring(2, 8).toUpperCase();
        ctx.fillText(`VECTOR_ID: 0x${rndHex}`, boxX + boxW - 120, boxY + 16);
        ctx.fillText(`CALC_FREQ: 64.2Hz`, boxX + boxW - 120, boxY + 28);
      }

      animationRef.current = requestAnimationFrame(drawScanner);
    };

    drawScanner();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, scanSuccess]);

  // Capture current video frame as base64
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !hasPermission) return;

    try {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = video.videoWidth || 640;
      tempCanvas.height = video.videoHeight || 480;
      
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        // Flip horizontally to match mirrored preview
        tempCtx.translate(tempCanvas.width, 0);
        tempCtx.scale(-1, 1);
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        
        const base64 = tempCanvas.toDataURL("image/jpeg", 0.85);
        onCapture(base64);
      }
    } catch (e) {
      console.error("Frame capture error:", e);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-lg mx-auto bg-zinc-950 dark:bg-black rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden aspect-[4/3]">
      {hasPermission === null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 text-zinc-400">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-sm font-medium">Requesting camera access...</span>
        </div>
      )}

      {hasPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900 text-zinc-300">
          <AlertCircle className="h-12 w-12 text-red-500 mb-3 animate-bounce" />
          <h3 className="text-lg font-semibold text-white mb-2">Camera Connection Failed</h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed">{errorMsg}</p>
          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Camera className="h-4 w-4" />
            Retry Connection
          </button>
        </div>
      )}

      {hasPermission === true && (
        <>
          {/* Mirrored video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {/* Canvas overlays */}
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
          />

          {/* Quick Snapshot Trigger Floating Panel */}
          {!isScanning && scanSuccess === null && (
            <button
              onClick={captureFrame}
              type="button"
              className="absolute bottom-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg shadow-black/30 hover:scale-105 active:scale-95 transition-all ring-4 ring-blue-500/35"
              title="Capture Scan Photo"
            >
              <div className="h-5 w-5 rounded-full border-2 border-zinc-900 bg-transparent flex items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-900"></div>
              </div>
            </button>
          )}

          {/* Scan Status Floating Alert banner */}
          {(isScanning || scanStatus) && (
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-zinc-900/80 border border-zinc-800 text-xs font-medium text-white shadow-lg">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  scanSuccess === true
                    ? "bg-emerald-500 animate-ping"
                    : scanSuccess === false
                    ? "bg-red-500"
                    : "bg-blue-500 animate-pulse"
                }`}></span>
                <span>{scanStatus || "Analyzing biometric data..."}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
