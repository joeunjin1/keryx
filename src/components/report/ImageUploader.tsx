'use client';
import { useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  className?: string;
  placeholder?: string;
  aspectRatio?: string; // e.g. "aspect-video", "aspect-square"
}

export default function ImageUploader({
  value, onChange, label, folder = 'reports', className = '', placeholder, aspectRatio = 'aspect-video'
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const res = await fetch('/api/report/upload-image', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.url) {
        onChange(json.url);
      } else {
        setError(json.error || '업로드 실패');
      }
    } catch (e: any) {
      setError(e.message || '업로드 중 오류');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className={`${className}`}>
      {label && <div className="text-xs font-semibold text-gray-600 mb-1">{label}</div>}
      <div
        className={`relative border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all ${
          value ? 'border-indigo-200' : 'border-gray-200 hover:border-indigo-300'
        } ${aspectRatio} bg-gray-50`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="업로드된 이미지"
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full">
                🔄 이미지 변경
              </span>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 shadow"
            >
              ✕
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            {uploading ? (
              <>
                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-500">업로드 중...</span>
              </>
            ) : (
              <>
                <span className="text-3xl">📷</span>
                <span className="text-xs text-gray-500 text-center">
                  {placeholder || '클릭하거나 드래그하여 이미지 업로드'}
                </span>
                <span className="text-xs text-gray-400">JPG / PNG / WebP · 최대 15MB</span>
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}
