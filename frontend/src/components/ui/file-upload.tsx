import * as React from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface FileUploadProps {
  label?: string;
  description?: string;
  accept?: string;
  maxSizeBytes?: number;
  value?: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  label = 'Upload Document',
  description = 'PNG, JPG, or PDF up to 5MB',
  accept = 'image/png,image/jpeg,image/jpg,application/pdf',
  maxSizeBytes = 5 * 1024 * 1024,
  value,
  onChange,
  error,
  disabled = false,
  className,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (value && value.type.startsWith('image/')) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [value]);

  const handleFile = (file: File) => {
    setLocalError(null);
    if (file.size > maxSizeBytes) {
      setLocalError(`File size exceeds ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB limit`);
      return;
    }
    onChange(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const activeError = error || localError;

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer',
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
            : value
            ? 'border-emerald-300 bg-emerald-50/20 dark:border-emerald-900 dark:bg-emerald-950/20'
            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700',
          activeError && 'border-rose-300 bg-rose-50/20 dark:border-rose-900 dark:bg-rose-950/20',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
          className="hidden"
          aria-label={label}
        />

        {value ? (
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-between">
            <div className="flex items-center gap-3.5 text-left truncate">
              {previewUrl ? (
                <div className="h-12 w-12 rounded-xl overflow-hidden border border-emerald-200 bg-white shrink-0 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Upload preview" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
              )}
              <div className="truncate">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{value.name}</p>
                <p className="text-xs font-medium text-slate-500">{(value.size / 1024).toFixed(1)} KB • Attached</p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
              <span>Remove</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/70 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-3 shadow-xs">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
            <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Click to browse or drag and drop</p>
          </div>
        )}
      </div>

      {activeError && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{activeError}</span>
        </p>
      )}
    </div>
  );
}
