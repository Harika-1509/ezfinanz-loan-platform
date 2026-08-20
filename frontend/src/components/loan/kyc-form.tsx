'use client';

import React, { useState } from 'react';
import {
  FileText,
  User,
  Calendar,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { kycSchema, extractFieldErrors } from '../../lib/validation';
import { compressImage } from '../../lib/image-compress';
import { useAuth } from '../../contexts/auth-context';
import { apiClient } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { FileUpload } from '../ui/file-upload';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';

export interface KycFormProps {
  onSuccess?: () => void;
}

export function KycForm({ onSuccess }: KycFormProps) {
  const { updateApplicationStage } = useAuth();

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState<'PAN' | 'AADHAAR'>('PAN');
  const [idNumber, setIdNumber] = useState('');

  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleIdTypeChange = (newType: 'PAN' | 'AADHAAR') => {
    setIdType(newType);
    setIdNumber('');
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.idNumber;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const validation = kycSchema.safeParse({
      fullName,
      dob,
      gender,
      address,
      idType,
      idNumber: idNumber.toUpperCase(),
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      if (documentFile) {
        // Multipart submission with client-side image compression
        let uploadFile: File | Blob = documentFile;
        if (documentFile.type.startsWith('image/')) {
          try {
            const compressed = await compressImage(documentFile, {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 0.85,
            });
            uploadFile = new File([compressed.blob], documentFile.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
            });
          } catch (compressErr) {
            console.warn('KYC image compression fallback to raw file:', compressErr);
          }
        }

        const formData = new FormData();
        formData.append('fullName', fullName);
        formData.append('dob', dob);
        formData.append('gender', gender);
        formData.append('address', address);
        formData.append('idType', idType);
        formData.append('idNumber', idNumber.toUpperCase());
        formData.append('idPhoto', uploadFile);

        await apiClient.upload('/kyc/submit', formData);
      } else {
        // JSON payload
        await apiClient.post('/kyc/submit', {
          fullName,
          dob,
          gender,
          address,
          idType,
          idNumber: idNumber.toUpperCase(),
        });
      }

      updateApplicationStage('KYC_SUBMITTED');
      setSuccessMessage('KYC documents submitted successfully! Transitioning to eligibility underwriting...');

      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (err) {
      const { fieldErrors: extractedFieldErrors, generalMessage } = extractFieldErrors(
        err,
        'Failed to submit KYC details. Please check your information.'
      );
      setErrorMessage(generalMessage);
      if (Object.keys(extractedFieldErrors).length > 0) {
        setFieldErrors(extractedFieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/80 shadow-fintech backdrop-blur-xl dark:border-slate-800/80">
      <CardHeader>
        <div className="flex items-center space-x-3 text-emerald-600">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 shadow-xs">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white">
              Step 2: KYC & Identity Verification
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Provide your government-issued ID details to verify legal lending eligibility.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Alert Notification Banners */}
        {errorMessage && (
          <div role="alert" className="flex items-start space-x-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 font-medium animate-in fade-in-50">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-bold">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div role="status" className="flex items-start space-x-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 font-medium animate-in fade-in-50">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1 font-bold">{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name & DOB */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Full Name (As per PAN / Aadhaar)
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={Boolean(fieldErrors.fullName)}
                disabled={isLoading}
              />
              {fieldErrors.fullName && (
                <p className="text-xs font-semibold text-rose-600">{fieldErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dob" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Date of Birth (Must be 18+)
              </Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                error={Boolean(fieldErrors.dob)}
                disabled={isLoading}
              />
              {fieldErrors.dob && (
                <p className="text-xs font-semibold text-rose-600">{fieldErrors.dob}</p>
              )}
            </div>
          </div>

          {/* Gender Selector */}
          <div className="space-y-1.5">
            <Label required className="text-xs font-bold text-slate-700 dark:text-slate-300">Gender</Label>
            <div className="grid grid-cols-3 gap-2.5" role="group" aria-label="Select Gender">
              {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  aria-pressed={gender === g}
                  className={`inline-flex items-center justify-center rounded-xl border px-3 py-2.5 text-xs font-bold transition-all min-h-[44px] leading-normal text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer ${
                    gender === g
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-200 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {g === 'MALE' ? 'Male' : g === 'FEMALE' ? 'Female' : 'Other'}
                </button>
              ))}
            </div>
          </div>

          {/* ID Type Selector */}
          <div className="space-y-2">
            <Label required className="text-xs font-bold text-slate-700 dark:text-slate-300">Government ID Type</Label>
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="Select Government ID Type">
              <button
                type="button"
                onClick={() => handleIdTypeChange('PAN')}
                aria-pressed={idType === 'PAN'}
                className={`inline-flex items-center justify-center space-x-2 rounded-xl border px-4 py-3 text-xs font-bold transition-all min-h-[48px] leading-normal text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer ${
                  idType === 'PAN'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-200 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>PAN Card</span>
              </button>

              <button
                type="button"
                onClick={() => handleIdTypeChange('AADHAAR')}
                aria-pressed={idType === 'AADHAAR'}
                className={`inline-flex items-center justify-center space-x-2 rounded-xl border px-4 py-3 text-xs font-bold transition-all min-h-[48px] leading-normal text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer ${
                  idType === 'AADHAAR'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-200 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Aadhaar Card</span>
              </button>
            </div>
          </div>

          {/* ID Document Number */}
          <div className="space-y-1.5">
            <Label htmlFor="idNumber" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {idType === 'PAN' ? '10-Digit PAN Number' : '12-Digit Aadhaar Number'}
            </Label>
            <Input
              id="idNumber"
              type="text"
              placeholder={idType === 'PAN' ? 'e.g. ABCDE1234F' : 'e.g. 123456789012'}
              maxLength={idType === 'PAN' ? 10 : 12}
              value={idNumber}
              onChange={(e) =>
                setIdNumber(idType === 'PAN' ? e.target.value.toUpperCase() : e.target.value)
              }
              error={Boolean(fieldErrors.idNumber)}
              disabled={isLoading}
              className="font-mono uppercase tracking-wider"
            />
            {fieldErrors.idNumber && (
              <p className="text-xs font-semibold text-rose-600">{fieldErrors.idNumber}</p>
            )}
          </div>

          {/* Residential Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address" required className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Current Residential Address
            </Label>
            <Textarea
              id="address"
              placeholder="Flat / House No., Street, Landmark, City, State, PIN Code"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={Boolean(fieldErrors.address)}
              disabled={isLoading}
            />
            {fieldErrors.address && (
              <p className="text-xs font-semibold text-rose-600">{fieldErrors.address}</p>
            )}
          </div>

          {/* ID Document Photo Upload */}
          <div className="pt-1">
            <FileUpload
              label="Attach ID Document Photo (Optional)"
              description={`Upload clear photo of your ${idType} (PNG/JPG up to 5MB)`}
              value={documentFile}
              onChange={(file) => setDocumentFile(file)}
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-md shadow-emerald-950/10 mt-4 rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating KYC Documents...
              </>
            ) : (
              <>
                Submit KYC & Continue to Underwriting
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="bg-slate-50/70 py-4 dark:bg-slate-900/70 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="w-full text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-emerald-600" />
          <span>Your identity data is encrypted and validated in accordance with RBI KYC master directions.</span>
        </p>
      </CardFooter>
    </Card>
  );
}
