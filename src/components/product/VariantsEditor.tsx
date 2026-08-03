"use client";
/**
 * VariantsEditor — 상품 변형(색상/사이즈) 편집기 v2
 * 컬러별 사진 등록 기능 추가 (image_url + images 배열)
 * keryx-platform-dev 스킬 §1.2 준수 - 한국어/중국어 이중 언어 지원
 */
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ProductVariant {
  id?: string;
  name: string;
  nameZh?: string;
  sku?: string;
  variant_sku?: string; // 하위 호환성 필드
  color_name?: string;  // 컬러 이름 (상세 페이지에서 사용)
  color?: string;
  size?: string;
  size_label?: string;
  stock?: number;
  moq?: number;
  additionalPrice?: number;
  unit_price_cny?: number;
  imageUrl?: string;
  image_url?: string;   // 컬러 대표 사진 URL
  images?: string[];    // 컬러별 추가 사진 URLs
}

interface VariantsEditorProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  lang?: "ko" | "zh";
  productSku?: string;
  accentColor?: string;
}

const T = {
  ko: {
    title: "컬러/옵션 등록",
    subtitle: "컬러별 사진을 등록하면 쇼핑몰에서 컬러 선택 시 해당 사진이 표시됩니다",
    name: "컬러명 (한국어)",
    nameZh: "컬러명 (중국어)",
    sku: "SKU",
    stock: "재고",
    moq: "MOQ",
    price: "단가 (¥)",
    addVariant: "+ 컬러/옵션 추가",
    remove: "삭제",
    placeholder_name: "예: 미杏色",
    placeholder_nameZh: "예: 米杏色",
    placeholder_sku: "예: SKU-001",
    placeholder_stock: "예: 100",
    main_photo: "대표 사진",
    extra_photos: "추가 사진 (최대 5장)",
    upload_main: "대표 사진 업로드",
    upload_extra: "추가 사진 업로드",
    uploading: "업로드 중...",
    photo_tip: "컬러 선택 시 이 사진들이 표시됩니다",
    no_variants: "컬러/옵션을 추가하세요",
    delete_photo: "사진 삭제",
  },
  zh: {
    title: "颜色/规格登记",
    subtitle: "登记各颜色照片后，在商城选择颜色时将显示对应照片",
    name: "颜色名称（韩文）",
    nameZh: "颜色名称（中文）",
    sku: "SKU",
    stock: "库存",
    moq: "MOQ",
    price: "单价 (¥)",
    addVariant: "+ 添加颜色/规格",
    remove: "删除",
    placeholder_name: "例: 米杏色",
    placeholder_nameZh: "例: 米杏色",
    placeholder_sku: "例: SKU-001",
    placeholder_stock: "例: 100",
    main_photo: "代表照片",
    extra_photos: "附加照片（最多5张）",
    upload_main: "上传代表照片",
    upload_extra: "上传附加照片",
    uploading: "上传中...",
    photo_tip: "选择颜色时将显示这些照片",
    no_variants: "请添加颜色/规格",
    delete_photo: "删除照片",
  },
};

export default function VariantsEditor({ variants, onChange, lang = "ko", productSku, accentColor }: VariantsEditorProps) {
  const t = T[lang];
  const supabase = createClient();
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const mainFileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const extraFileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addVariant = () => {
    onChange([...variants, { name: "", nameZh: "", sku: "", stock: 0, images: [] }]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const updated = variants.map((v, i) =>
      i === index ? { ...v, [field]: value } : v
    );
    onChange(updated);
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  // 이미지 업로드 (Supabase Storage)
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `variants/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      return publicUrl;
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      return null;
    }
  };

  // 대표 사진 업로드
  const handleMainPhotoUpload = async (index: number, file: File) => {
    setUploadingIdx(index);
    const url = await uploadImage(file);
    if (url) {
      updateVariant(index, 'image_url', url);
      // imageUrl도 동기화 (하위 호환)
      const updated = variants.map((v, i) =>
        i === index ? { ...v, image_url: url, imageUrl: url, color_name: v.name || v.color_name } : v
      );
      onChange(updated);
    }
    setUploadingIdx(null);
  };

  // 추가 사진 업로드
  const handleExtraPhotosUpload = async (index: number, files: FileList) => {
    setUploadingIdx(index);
    const currentImages = variants[index].images || [];
    const remaining = 5 - currentImages.length;
    const toUpload = Array.from(files).slice(0, remaining);
    const urls: string[] = [];
    for (const file of toUpload) {
      const url = await uploadImage(file);
      if (url) urls.push(url);
    }
    if (urls.length > 0) {
      updateVariant(index, 'images', [...currentImages, ...urls]);
    }
    setUploadingIdx(null);
  };

  // 추가 사진 삭제
  const removeExtraPhoto = (variantIdx: number, photoIdx: number) => {
    const images = [...(variants[variantIdx].images || [])];
    images.splice(photoIdx, 1);
    updateVariant(variantIdx, 'images', images);
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-sm font-bold text-neutral-800">{t.title}</span>
          <p className="text-xs text-indigo-600 mt-0.5">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          {t.addVariant}
        </button>
      </div>

      {variants.length === 0 && (
        <div className="text-center py-6 text-sm text-neutral-400 border-2 border-dashed border-neutral-200 rounded-xl">
          {t.no_variants}
        </div>
      )}

      {variants.map((variant, index) => (
        <div key={index} className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
          {/* 컬러 헤더 */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              {variant.image_url && (
                <img src={variant.image_url} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm" />
              )}
              <span className="text-xs font-bold text-indigo-700">
                {lang === "ko" ? `컬러 ${index + 1}` : `颜色 ${index + 1}`}
                {variant.name && <span className="ml-1 text-neutral-600">— {variant.name}</span>}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeVariant(index)}
              className="text-red-400 hover:text-red-600 text-sm font-bold transition-colors px-1"
            >
              ×
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase tracking-wide">{t.name}</label>
                <input
                  type="text"
                  value={variant.name}
                  onChange={e => {
                    const updated = variants.map((v, i) =>
                      i === index ? { ...v, name: e.target.value, color_name: e.target.value, color: e.target.value } : v
                    );
                    onChange(updated);
                  }}
                  placeholder={t.placeholder_name}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase tracking-wide">{t.nameZh}</label>
                <input
                  type="text"
                  value={variant.nameZh || ""}
                  onChange={e => updateVariant(index, "nameZh", e.target.value)}
                  placeholder={t.placeholder_nameZh}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase tracking-wide">{t.sku}</label>
                <input
                  type="text"
                  value={variant.sku || ""}
                  onChange={e => updateVariant(index, "sku", e.target.value)}
                  placeholder={t.placeholder_sku}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase tracking-wide">{t.stock}</label>
                <input
                  type="number"
                  value={variant.stock ?? ""}
                  onChange={e => updateVariant(index, "stock", Number(e.target.value))}
                  placeholder={t.placeholder_stock}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                />
              </div>
            </div>

            {/* 사진 섹션 */}
            <div className="bg-neutral-50 rounded-xl p-3 space-y-3">
              <p className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                📷 {t.photo_tip}
              </p>

              {/* 대표 사진 */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-2 uppercase tracking-wide">{t.main_photo}</label>
                <div className="flex items-center gap-3">
                  {variant.image_url ? (
                    <div className="relative group">
                      <img
                        src={variant.image_url}
                        alt=""
                        className="w-20 h-20 rounded-xl object-cover border-2 border-indigo-300 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => updateVariant(index, 'image_url', '')}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ) : (
                    <div
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                      onClick={() => mainFileRefs.current[index]?.click()}
                    >
                      <span className="text-2xl">📷</span>
                      <span className="text-[9px] text-neutral-400 mt-1 text-center leading-tight">
                        {uploadingIdx === index ? t.uploading : t.upload_main}
                      </span>
                    </div>
                  )}
                  {!variant.image_url && (
                    <button
                      type="button"
                      onClick={() => mainFileRefs.current[index]?.click()}
                      className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all"
                      disabled={uploadingIdx === index}
                    >
                      {uploadingIdx === index ? t.uploading : t.upload_main}
                    </button>
                  )}
                  <input
                    ref={el => { mainFileRefs.current[index] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleMainPhotoUpload(index, file);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              {/* 추가 사진 */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-2 uppercase tracking-wide">
                  {t.extra_photos} ({(variant.images || []).length}/5)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(variant.images || []).map((imgUrl, photoIdx) => (
                    <div key={photoIdx} className="relative group">
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover border border-neutral-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeExtraPhoto(index, photoIdx)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                  {(variant.images || []).length < 5 && (
                    <div
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                      onClick={() => extraFileRefs.current[index]?.click()}
                    >
                      <span className="text-xl">+</span>
                      <span className="text-[8px] text-neutral-400">
                        {uploadingIdx === index ? '...' : lang === 'ko' ? '추가' : '添加'}
                      </span>
                    </div>
                  )}
                  <input
                    ref={el => { extraFileRefs.current[index] = el; }}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      if (e.target.files) handleExtraPhotosUpload(index, e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
