'use client';
import { useRef, useState } from 'react';

interface Props {
  values: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  folder?: string;
  maxCount?: number;
}

export default function MultiImageUploader({ values, onChange, label, folder = 'reports', maxCount = 6 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    setError('');
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      if (values.length + newUrls.length >= maxCount) break;
      const file = files[i];
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        const res = await fetch('/api/report/upload-image', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.url) newUrls.push(json.url);
        else setError(json.error || '업로드 실패');
      } catch (e: any) {
        setError(e.message);
      }
    }
    onChange([...values, ...newUrls]);
    setUploading(false);
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  return (
    <div>
      {label && <div className="text-xs font-semibold text-gray-600 mb-2">{label}</div>}
      <div className="flex flex-wrap gap-2">
        {values.map((url, idx) => (
          <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`사진 ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-center text-xs py-0.5">
              {idx + 1}
            </div>
          </div>
        ))}
        {values.length < maxCount && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-indigo-500 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-xl">+</span>
                <span className="text-xs">사진 추가</span>
              </>
            )}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <p className="text-xs text-gray-400 mt-1">최대 {maxCount}장 · JPG/PNG/WebP</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
