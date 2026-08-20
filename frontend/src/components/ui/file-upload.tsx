'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

export interface FileUploadProps {
  label?: string;
  helperText?: string;
  accept?: string;
  maxSizeMb?: number;
  value?: File | null;
  previewUrl?: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function FileUpload({
  label = 'Upload Document',
  helperText = 'PNG, JPG, or JPEG up to 5MB',
  accept = 'image/jpeg,image/png,image/webp,image/jpg',
  maxSizeMb = 5,
  value,
  previewUrl,
  onChange,
  disabled = false,
  error,
  className,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    setLocalError(null);
    if (!file) {
      onChange(null, null);
      return;
    }

    // Validate size
    if (file.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`File exceeds maximum allowed size of ${maxSizeMb}MB.`);
      return;
    }

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);
    onChange(file, objectUrl);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFile(droppedFile);
    }
  };

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChange(null, null);
    setLocalError(null);
  };

  const displayError = error || localError;

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </span>
      )}

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {previewUrl || value ? (
        /* Preview Card */
        <div className="relative flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center space-x-3 overflow-hidden">
            {previewUrl ? (
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Document Preview"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                {value ? value.name : 'Document Attached'}
              </p>
              <p className="text-[11px] text-slate-400">
                {value ? `${(value.size / 1024 / 1024).toFixed(2)} MB` : 'Attached'}
              </p>
              <div className="mt-0.5 inline-flex items-center space-x-1 text-[10px] font-medium text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>Ready for submission</span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={handleClear}
            className="text-slate-400 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label="Remove attached file"
            title="Remove attached file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        /* Dropzone Card with Keyboard Accessibility */
        <div
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label={label}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled) fileInputRef.current?.click();
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/60 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900',
            displayError && 'border-rose-500 bg-rose-50/30',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <UploadCloud className="h-5 w-5" />
          </div>
          <p className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            Click to upload or drag and drop
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
        </div>
      )}

      {displayError && (
        <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{displayError}</p>
      )}
    </div>
  );
}
