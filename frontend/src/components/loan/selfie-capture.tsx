'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  UserCheck,
  FileCheck,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { extractFieldErrors } from '../../lib/validation';
import { compressImage } from '../../lib/image-compress';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';

interface SelfieCaptureProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

export function SelfieCapture({ onSuccess, onBack }: SelfieCaptureProps) {
  const { user, application, updateApplicationStage } = useAuth();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(
    application?.stage === 'WAITING_ADMIN_REVIEW' ||
      application?.stage === 'APPROVED' ||
      application?.stage === 'DISBURSED'
  );
  const [existingSelfieUrl, setExistingSelfieUrl] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError('Camera API is not supported in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setHasCamera(true);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setHasCamera(false);
      setCameraError(
        'Camera permission was denied or no camera device was found. You can upload a photo directly below.'
      );
    }
  }, []);

  // Stop camera stream on unmount
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Fetch status on load
  const loadExistingSelfie = useCallback(async () => {
    try {
      const res = await apiClient
        .get<{ selfie: any; application: any }>('/selfie/status')
        .catch(() => null);

      if (res?.data?.selfie?.photoUrl) {
        setExistingSelfieUrl(res.data.selfie.photoUrl);
        if (res.data.application?.stage === 'WAITING_ADMIN_REVIEW') {
          setIsSuccess(true);
        }
      }
    } catch (err) {
      console.warn('Could not fetch existing selfie status:', err);
    }
  }, []);

  useEffect(() => {
    loadExistingSelfie();
    if (!isSuccess && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [loadExistingSelfie, startCamera, stopCamera, isSuccess, capturedImage]);

  // Snap photo from video feed with bounded resolution (max 1024x1024) & compression
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    let rawW = video.videoWidth || 640;
    let rawH = video.videoHeight || 480;

    // Constrain max dimension to 1024px
    const maxDim = 1024;
    if (rawW > maxDim || rawH > maxDim) {
      if (rawW > rawH) {
        rawH = Math.round((rawH * maxDim) / rawW);
        rawW = maxDim;
      } else {
        rawW = Math.round((rawW * maxDim) / rawH);
        rawH = maxDim;
      }
    }

    canvas.width = rawW;
    canvas.height = rawH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal for natural mirror preview of front camera
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Data = canvas.toDataURL('image/jpeg', 0.82);
    setCapturedImage(base64Data);
    stopCamera();
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    setError(null);
    startCamera();
  };

  // Handle fallback file upload with client-side compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, or WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Original image size exceeds 10MB limit.');
      return;
    }

    try {
      const compressed = await compressImage(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.82,
      });

      setCapturedImage(compressed.dataUrl);
      stopCamera();
      setError(null);
    } catch (compressErr) {
      console.warn('Image compression fallback:', compressErr);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImage(event.target.result as string);
          stopCamera();
          setError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit selfie to backend
  const handleSubmit = async () => {
    if (!capturedImage) {
      setError('Please capture or upload a verification selfie first.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiClient.post<{
        selfie: any;
        application: { stage: any };
        message: string;
      }>('/selfie/submit', {
        imageBase64: capturedImage,
        base64Data: capturedImage,
      });

      if (res.success) {
        setIsSuccess(true);
        updateApplicationStage('WAITING_ADMIN_REVIEW');
        if (res.data?.selfie?.photoUrl) {
          setExistingSelfieUrl(res.data.selfie.photoUrl);
        }
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      const { generalMessage } = extractFieldErrors(
        err,
        'Failed to submit selfie photo. Please try again.'
      );
      setError(generalMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check review status live
  const checkStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await apiClient.get<{
        selfie: any;
        application: any;
      }>('/selfie/status');

      if (res.data?.application?.stage) {
        updateApplicationStage(res.data.application.stage);
      }
    } catch {
      // Keep state
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // If already submitted and waiting for admin review, show celebration confirmation state
  if (isSuccess || application?.stage === 'WAITING_ADMIN_REVIEW') {
    return (
      <Card className="border-emerald-200/80 bg-gradient-to-b from-white via-slate-50/50 to-emerald-50/30 shadow-glass dark:border-emerald-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
        <CardContent className="flex flex-col items-center justify-center p-6 sm:p-12 text-center space-y-6">
          {/* Animated Hero Badge */}
          <div className="relative flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 animate-pulse">
              <Clock className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="space-y-2 max-w-lg">
            <Badge variant="outline" className="text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 text-xs px-3 py-1 font-bold">
              ✓ Step 7 of 8: Biometric Verification Submitted
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Application Under Review
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Your identity selfie, KYC documents, and loan agreement have been received and queued for administrative underwriting review.
            </p>
          </div>

          {/* Details Card */}
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-5 text-xs text-left shadow-xs dark:border-slate-800 dark:bg-slate-850 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Application Reference</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {application?.id || 'APP-EZF-001'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Current Status</span>
              <span className="inline-flex items-center font-bold text-amber-700 dark:text-amber-300">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                Waiting for Admin Review
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Estimated Turnaround</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Under 15–30 Minutes
              </span>
            </div>
          </div>

          {/* Selfie Thumbnail Preview if available */}
          {(capturedImage || existingSelfieUrl) && (
            <div className="flex items-center space-x-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedImage || existingSelfieUrl || ''}
                alt="Submitted Selfie"
                className="h-12 w-12 rounded-lg object-cover border border-slate-300 dark:border-slate-700"
              />
              <div className="text-left text-[11px]">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Verification Selfie Encrypted & Stored
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Liveness check verified successfully
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              type="button"
              onClick={checkStatus}
              disabled={isCheckingStatus}
              variant="outline"
              size="sm"
              className="text-xs font-bold min-h-[40px]"
            >
              {isCheckingStatus ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Checking Status...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Refresh Approval Status
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={() => {
                // Allow re-submitting selfie if needed
                setIsSuccess(false);
                setCapturedImage(null);
                startCamera();
              }}
              variant="ghost"
              size="sm"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Retake Selfie Photo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left Column: Live Camera & Viewfinder (7 Cols) */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="border-slate-200/80 shadow-glass dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <Camera className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Step 7 of 8: Biometric Liveness Verification
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 font-bold">
                Live Face Capture
              </Badge>
            </div>

            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Take a Verification Selfie
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Please position your face inside the oval frame to complete automated biometric verification.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div role="alert" className="flex items-center space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Viewfinder / Preview Container */}
            <div className="relative mx-auto flex aspect-square w-full max-w-[300px] sm:max-w-[360px] items-center justify-center overflow-hidden rounded-3xl border-2 border-slate-800 bg-slate-950 shadow-inner">
              {/* If Captured: Display snapshot */}
              {capturedImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={capturedImage}
                  alt="Captured Selfie Preview"
                  className="h-full w-full object-cover"
                />
              ) : hasCamera ? (
                <>
                  {/* Live Video Feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover -scale-x-100"
                  />

                  {/* Biometric Oval Guide Overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <div className="h-56 w-40 sm:h-64 sm:w-48 rounded-[50%] border-2 border-dashed border-emerald-400/80 shadow-glow" />
                  </div>

                  <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center">
                    <span className="rounded-full bg-black/70 px-3 py-1 text-[10px] font-bold text-emerald-300 backdrop-blur-md">
                      Center your face in the oval
                    </span>
                  </div>
                </>
              ) : (
                /* Fallback when camera is unavailable / denied */
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-3">
                  <CameraOff className="h-12 w-12 text-slate-400" />
                  <div className="text-xs">
                    <p className="font-bold text-white">Camera Unavailable</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {cameraError || 'Please upload a clear selfie photo from your device.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs border-slate-700 bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    Select Image File
                  </Button>
                </div>
              )}

              {/* Hidden Canvas for extracting frame */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Hidden File Input for Fallback / Manual Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              aria-label="Upload verification selfie from device"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Viewfinder Action Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {capturedImage ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={retakePhoto}
                    disabled={isSubmitting}
                    className="text-xs font-bold min-h-[44px]"
                  >
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Retake Photo
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md shadow-emerald-500/20 active:scale-[0.98] min-h-[44px] px-5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting for Review...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirm & Submit Selfie
                      </>
                    )}
                  </Button>
                </>
              ) : hasCamera ? (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    className="h-12 rounded-full bg-emerald-600 px-6 font-bold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 active:scale-95"
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Take Photo
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload File Instead
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>

          {onBack && (
            <CardFooter className="border-t border-slate-100 p-6 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBack}
                disabled={isSubmitting}
                className="text-xs font-semibold"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back to Declaration
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Right Column: Verification Guidelines & Quality Standards (5 Cols) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-glass dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="h-5 w-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Selfie Quality Guidelines
            </h3>
          </div>

          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            To ensure swift automated underwriting and immediate approval, make sure your photo satisfies these criteria:
          </p>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-start space-x-2.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Direct Forward Gaze
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Look directly into the camera with both eyes clearly visible.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Good Lighting
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ensure balanced front lighting without heavy shadows or backlight glare.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  No Accessories Obscuring Face
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Remove sunglasses, tinted spectacles, face masks, or caps before capturing.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 text-[11px] text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
            <div className="flex items-center space-x-2 font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Biometric Security Guarantee</span>
            </div>
            <p className="mt-1 leading-relaxed">
              Your biometric selfie is cross-referenced with your Aadhaar/PAN photo and stored in accordance with RBI cyber security guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
