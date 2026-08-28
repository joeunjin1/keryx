'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useLangContext } from '@/components/layout/LangContext';

type Status = 'draft' | 'published' | 'archived';
type IpItem = {
  id: string; name_ko: string; name_zh: string; name_en: string; slug: string;
  description_ko: string; description_zh: string; description_en: string;
  world_name_ko: string; world_name_zh: string; world_summary_ko: string; world_summary_zh: string;
  logo_url: string; banner_url: string; profile_image_url: string; color_primary: string; color_secondary: string;
  sort_order: number; development_status: Status; is_active: boolean; published_at: string | null;
};
type CastItem = { id: string; name_ko: string; name_zh: string; name_en: string; slug: string; role_ko: string; role_zh: string; profile_ko: string; profile_zh: string; profile_image_url: string; sort_order: number; publication_status: Status };
type ContentItem = { id: string; content_type: 'storybook' | 'webtoon' | 'novel' | 'shortform' | 'news'; episode_no: number | null; slug: string; title_ko: string; title_zh: string; excerpt_ko: string; excerpt_zh: string; body_ko: string; body_zh: string; cover_asset_id: string | null; publication_status: Status; sort_order: number };
type Tab = 'ip' | 'cast' | 'content' | 'guide';

const emptyIp = (): Omit<IpItem, 'id' | 'is_active' | 'published_at'> => ({
  name_ko: '', name_zh: '', name_en: '', slug: '', description_ko: '', description_zh: '', description_en: '',
  world_name_ko: '', world_name_zh: '', world_summary_ko: '', world_summary_zh: '', logo_url: '', banner_url: '', profile_image_url: '',
  color_primary: '#312E81', color_secondary: '#E0E7FF', sort_order: 0, development_status: 'draft',
});
const emptyCast = (): Omit<CastItem, 'id'> => ({ name_ko: '', name_zh: '', name_en: '', slug: '', role_ko: '', role_zh: '', profile_ko: '', profile_zh: '', profile_image_url: '', sort_order: 0, publication_status: 'draft' });
const emptyContent = (): Omit<ContentItem, 'id' | 'cover_asset_id'> & { cover_asset_id: string | null } => ({ content_type: 'storybook', episode_no: null, slug: '', title_ko: '', title_zh: '', excerpt_ko: '', excerpt_zh: '', body_ko: '', body_zh: '', cover_asset_id: null, publication_status: 'draft', sort_order: 0 });

function apiToIp(payload: Omit<IpItem, 'id' | 'is_active' | 'published_at'> | IpItem) {
  return {
    nameKo: payload.name_ko, nameZh: payload.name_zh, nameEn: payload.name_en, slug: payload.slug,
    descriptionKo: payload.description_ko, descriptionZh: payload.description_zh, descriptionEn: payload.description_en,
    worldNameKo: payload.world_name_ko, worldNameZh: payload.world_name_zh, worldSummaryKo: payload.world_summary_ko, worldSummaryZh: payload.world_summary_zh,
    logoUrl: payload.logo_url, bannerUrl: payload.banner_url, profileImageUrl: payload.profile_image_url,
    colorPrimary: payload.color_primary, colorSecondary: payload.color_secondary, sortOrder: Number(payload.sort_order), status: payload.development_status,
  };
}

async function readJson(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || '요청을 처리하지 못했습니다.');
  return json;
}

export default function IpStudioConsole() {
  const { lang } = useLangContext();
  const zh = lang === 'zh';
  const [tab, setTab] = useState<Tab>('ip');
  const [items, setItems] = useState<IpItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ipForm, setIpForm] = useState<any>(emptyIp());
  const [castItems, setCastItems] = useState<CastItem[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [castForm, setCastForm] = useState<any>(emptyCast());
  const [contentForm, setContentForm] = useState<any>(emptyContent());
  const [editingCastId, setEditingCastId] = useState<string | null>(null);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const txt = zh ? {
    title: 'IP Studio', desc: '在一个地方管理原创IP、角色、世界观和连载内容。草稿不会显示在公开页面。',
    ip: 'IP主页', cast: '角色', content: '连载内容', guide: '登记指南', newIp: '新建IP', save: '保存', saving: '保存中', publish: '公开', draft: '草稿', archived: '已归档', archive: '归档', choose: '选择要管理的IP', upload: '直接上传图片', uploaded: '上传完成',
    basic: 'IP基本信息', world: '世界观', visual: '视觉与公开设置', ko: '韩文', zhLabel: '中文', en: '英文', name: '名称', slug: 'URL标识', intro: 'IP介绍', worldName: '世界观名称', worldSummary: '世界观简介', logo: 'Logo图片', banner: '横幅图片', profile: '代表图片', status: '状态', order: '排序', addCast: '添加角色', addContent: '添加内容', role: '角色定位', profileText: '角色介绍', type: '内容形式', episode: '集数', titleLabel: '标题', excerpt: '摘要', body: '正文', cover: '封面图片', edit: '编辑', delete: '归档', clear: '重置表单', loading: '正在加载IP数据…', noCast: '尚未登记角色。', noContent: '尚未登记内容。', confirmArchive: '确定要归档吗？公开页面将不再显示该项目。',
  } : {
    title: 'IP Studio', desc: '오리지널 IP, 캐릭터, 세계관, 연재 콘텐츠를 한곳에서 관리합니다. 초안은 공개 페이지에 표시되지 않습니다.',
    ip: 'IP 마스터', cast: '캐릭터', content: '연재 콘텐츠', guide: '등록 안내', newIp: '새 IP 등록', save: '저장', saving: '저장 중', publish: '공개', draft: '초안', archived: '보관됨', archive: '보관', choose: '관리할 IP를 선택하세요', upload: '이미지 직접 첨부', uploaded: '업로드 완료',
    basic: 'IP 기본 정보', world: '세계관', visual: '이미지·공개 설정', ko: '한국어', zhLabel: '중국어', en: '영어', name: '이름', slug: 'URL 슬러그', intro: 'IP 소개', worldName: '세계관 이름', worldSummary: '세계관 소개', logo: '로고 이미지', banner: '배너 이미지', profile: '대표 이미지', status: '상태', order: '정렬 순서', addCast: '캐릭터 추가', addContent: '콘텐츠 추가', role: '역할·포지션', profileText: '캐릭터 소개', type: '콘텐츠 형식', episode: '회차', titleLabel: '제목', excerpt: '요약', body: '본문', cover: '표지 이미지', edit: '수정', delete: '보관', clear: '입력 초기화', loading: 'IP 데이터를 불러오는 중입니다…', noCast: '등록된 캐릭터가 없습니다.', noContent: '등록된 콘텐츠가 없습니다.', confirmArchive: '보관하시겠습니까? 공개 페이지에서 더 이상 표시되지 않습니다.',
  };

  const setMessage = (message = '', isError = false) => { setNotice(isError ? '' : message); setError(isError ? message : ''); };
  const loadIps = async () => {
    setLoading(true);
    try {
      const json = await readJson(await fetch('/api/admin/ip', { cache: 'no-store' }));
      setItems(json.items);
      setSelectedId((current: string | null) => current && json.items.some((item: IpItem) => item.id === current) ? current : (json.items[0]?.id ?? null));
    } catch (e) { setMessage(e instanceof Error ? e.message : 'IP 목록을 불러오지 못했습니다.', true); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadIps(); }, []);
  useEffect(() => {
    if (!selectedId) { setIpForm(emptyIp()); setCastItems([]); setContentItems([]); return; }
    const loadDetail = async () => {
      try {
        const [ipJson, castJson, contentJson] = await Promise.all([
          readJson(await fetch(`/api/admin/ip/${selectedId}`, { cache: 'no-store' })),
          readJson(await fetch(`/api/admin/ip/${selectedId}/cast`, { cache: 'no-store' })),
          readJson(await fetch(`/api/admin/ip/${selectedId}/contents`, { cache: 'no-store' })),
        ]);
        setIpForm(ipJson.item); setCastItems(castJson.items); setContentItems(contentJson.items);
      } catch (e) { setMessage(e instanceof Error ? e.message : 'IP 상세 정보를 불러오지 못했습니다.', true); }
    };
    void loadDetail();
  }, [selectedId]);

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>, target: 'logo_url' | 'banner_url' | 'profile_image_url' | 'cast' | 'content') => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(); setSaving(true);
    try {
      const formData = new FormData(); formData.append('file', file); formData.append('purpose', target === 'cast' ? 'character_profile' : target === 'content' ? 'story_cover' : 'ip_cover'); formData.append('status', 'published');
      const json = await readJson(await fetch('/api/admin/media', { method: 'POST', body: formData }));
      if (target === 'cast') setCastForm((prev: any) => ({ ...prev, profile_image_url: json.asset.public_url }));
      else if (target === 'content') setContentForm((prev: any) => ({ ...prev, cover_asset_id: json.asset.id }));
      else setIpForm((prev: any) => ({ ...prev, [target]: json.asset.public_url }));
      setMessage(txt.uploaded);
    } catch (e) { setMessage(e instanceof Error ? e.message : '이미지를 업로드하지 못했습니다.', true); }
    finally { setSaving(false); event.target.value = ''; }
  };

  const submitIp = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage();
    try {
      const isExisting = Boolean(selected?.id);
      const response = await fetch(isExisting ? `/api/admin/ip/${selected!.id}` : '/api/admin/ip', {
        method: isExisting ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apiToIp(ipForm)),
      });
      const json = await readJson(response);
      await loadIps(); setSelectedId(json.item.id); setMessage(zh ? 'IP已保存。' : 'IP를 저장했습니다.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'IP를 저장하지 못했습니다.', true); }
    finally { setSaving(false); }
  };

  const submitCast = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedId) return; setSaving(true); setMessage();
    try {
      const payload = { nameKo: castForm.name_ko, nameZh: castForm.name_zh, nameEn: castForm.name_en, slug: castForm.slug, roleKo: castForm.role_ko, roleZh: castForm.role_zh, profileKo: castForm.profile_ko, profileZh: castForm.profile_zh, profileImageUrl: castForm.profile_image_url, status: castForm.publication_status, sortOrder: Number(castForm.sort_order) };
      const response = await fetch(editingCastId ? `/api/admin/ip/${selectedId}/cast/${editingCastId}` : `/api/admin/ip/${selectedId}/cast`, { method: editingCastId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await readJson(response); const json = await readJson(await fetch(`/api/admin/ip/${selectedId}/cast`, { cache: 'no-store' })); setCastItems(json.items); setCastForm(emptyCast()); setEditingCastId(null); setMessage(zh ? '角色已保存。' : '캐릭터를 저장했습니다.');
    } catch (e) { setMessage(e instanceof Error ? e.message : '캐릭터를 저장하지 못했습니다.', true); }
    finally { setSaving(false); }
  };

  const submitContent = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedId) return; setSaving(true); setMessage();
    try {
      const payload = { contentType: contentForm.content_type, episodeNo: contentForm.episode_no ? Number(contentForm.episode_no) : null, slug: contentForm.slug, titleKo: contentForm.title_ko, titleZh: contentForm.title_zh, excerptKo: contentForm.excerpt_ko, excerptZh: contentForm.excerpt_zh, bodyKo: contentForm.body_ko, bodyZh: contentForm.body_zh, coverAssetId: contentForm.cover_asset_id, status: contentForm.publication_status, sortOrder: Number(contentForm.sort_order) };
      const response = await fetch(editingContentId ? `/api/admin/ip/${selectedId}/contents/${editingContentId}` : `/api/admin/ip/${selectedId}/contents`, { method: editingContentId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await readJson(response); const json = await readJson(await fetch(`/api/admin/ip/${selectedId}/contents`, { cache: 'no-store' })); setContentItems(json.items); setContentForm(emptyContent()); setEditingContentId(null); setMessage(zh ? '内容已保存。' : '콘텐츠를 저장했습니다.');
    } catch (e) { setMessage(e instanceof Error ? e.message : '콘텐츠를 저장하지 못했습니다.', true); }
    finally { setSaving(false); }
  };

  const archiveItem = async (kind: 'ip' | 'cast' | 'content', id: string) => {
    if (!selectedId || !window.confirm(txt.confirmArchive)) return;
    try {
      const url = kind === 'ip' ? `/api/admin/ip/${id}` : kind === 'cast' ? `/api/admin/ip/${selectedId}/cast/${id}` : `/api/admin/ip/${selectedId}/contents/${id}`;
      await readJson(await fetch(url, { method: 'DELETE' }));
      if (kind === 'ip') { setSelectedId(null); await loadIps(); }
      if (kind === 'cast') setCastItems((prev) => prev.filter((item) => item.id !== id));
      if (kind === 'content') setContentItems((prev) => prev.filter((item) => item.id !== id));
      setMessage(zh ? '已归档。' : '보관 처리했습니다.');
    } catch (e) { setMessage(e instanceof Error ? e.message : '보관 처리하지 못했습니다.', true); }
  };

  const textInput = (label: string, value: string, onChange: (value: string) => void, options: { required?: boolean; placeholder?: string; type?: string } = {}) => <label className="grid gap-2 text-sm font-semibold text-slate-700"><span>{label}</span><input type={options.type ?? 'text'} required={options.required} value={value ?? ''} placeholder={options.placeholder} onChange={(e) => onChange(e.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>;
  const textArea = (label: string, value: string, onChange: (value: string) => void, rows = 3) => <label className="grid gap-2 text-sm font-semibold text-slate-700"><span>{label}</span><textarea value={value ?? ''} rows={rows} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>;
  const statusSelect = (value: Status, onChange: (value: Status) => void) => <label className="grid gap-2 text-sm font-semibold text-slate-700"><span>{txt.status}</span><select value={value} onChange={(e) => onChange(e.target.value as Status)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"><option value="draft">{txt.draft}</option><option value="published">{txt.publish}</option><option value="archived">{txt.archived}</option></select></label>;
  const uploadControl = (target: 'logo_url' | 'banner_url' | 'profile_image_url' | 'cast' | 'content') => <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-indigo-300 bg-indigo-50 px-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => void uploadImage(event, target)} />{txt.upload}</label>;

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-7">
    <header className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-6 text-white md:p-8">
      <p className="text-sm font-bold tracking-widest text-indigo-200">KERYX OPERATOR CONSOLE</p><h1 className="mt-2 text-3xl font-black md:text-4xl">{txt.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-indigo-100 md:text-base">{txt.desc}</p>
    </header>
    {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
    {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>}
    <div className="grid gap-6 xl:grid-cols-[17rem_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-6 xl:h-fit">
        <button onClick={() => { setSelectedId(null); setIpForm(emptyIp()); setTab('ip'); }} className="mb-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-700">+ {txt.newIp}</button>
        {loading ? <p className="px-3 py-4 text-sm text-slate-500">{txt.loading}</p> : <div className="space-y-1">{items.map((item) => <button key={item.id} onClick={() => { setSelectedId(item.id); setTab('ip'); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selectedId === item.id ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50'}`}><span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color_primary }} /><span className="min-w-0 flex-1"><b className="block truncate text-sm">{zh && item.name_zh ? item.name_zh : item.name_ko}</b><small className="block truncate text-xs text-slate-500">{item.development_status === 'published' ? txt.publish : item.development_status === 'archived' ? txt.archived : txt.draft}</small></span></button>)}</div>}
      </aside>
      <main className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <nav className="flex overflow-x-auto border-b border-slate-200 px-3" aria-label="IP Studio tabs">{(['ip', 'cast', 'content', 'guide'] as Tab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`min-h-12 whitespace-nowrap border-b-2 px-4 text-sm font-bold ${tab === item ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{item === 'ip' ? txt.ip : item === 'cast' ? txt.cast : item === 'content' ? txt.content : txt.guide}</button>)}</nav>
        <div className="p-4 md:p-6">
          {tab !== 'ip' && !selectedId ? <div className="rounded-2xl bg-slate-50 p-10 text-center text-sm text-slate-500">{txt.choose}</div> : null}
          {tab === 'ip' && <form onSubmit={(event) => void submitIp(event)} className="space-y-7">
            <section><h2 className="text-xl font-black text-slate-950">{txt.basic}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{textInput(`${txt.name} · ${txt.ko}`, ipForm.name_ko, (v) => setIpForm((p: any) => ({ ...p, name_ko: v })), { required: true })}{textInput(`${txt.name} · ${txt.zhLabel}`, ipForm.name_zh, (v) => setIpForm((p: any) => ({ ...p, name_zh: v })))}{textInput(`${txt.name} · ${txt.en}`, ipForm.name_en, (v) => setIpForm((p: any) => ({ ...p, name_en: v })))}{textInput(txt.slug, ipForm.slug, (v) => setIpForm((p: any) => ({ ...p, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') })), { required: true, placeholder: 'piggly' })}</div><div className="mt-4 grid gap-4 md:grid-cols-2">{textArea(`${txt.intro} · ${txt.ko}`, ipForm.description_ko, (v) => setIpForm((p: any) => ({ ...p, description_ko: v })))}{textArea(`${txt.intro} · ${txt.zhLabel}`, ipForm.description_zh, (v) => setIpForm((p: any) => ({ ...p, description_zh: v })))}</div></section>
            <section className="border-t border-slate-100 pt-7"><h2 className="text-xl font-black text-slate-950">{txt.world}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{textInput(`${txt.worldName} · ${txt.ko}`, ipForm.world_name_ko, (v) => setIpForm((p: any) => ({ ...p, world_name_ko: v })))}{textInput(`${txt.worldName} · ${txt.zhLabel}`, ipForm.world_name_zh, (v) => setIpForm((p: any) => ({ ...p, world_name_zh: v })))}{textArea(`${txt.worldSummary} · ${txt.ko}`, ipForm.world_summary_ko, (v) => setIpForm((p: any) => ({ ...p, world_summary_ko: v })))}{textArea(`${txt.worldSummary} · ${txt.zhLabel}`, ipForm.world_summary_zh, (v) => setIpForm((p: any) => ({ ...p, world_summary_zh: v })))}</div></section>
            <section className="border-t border-slate-100 pt-7"><h2 className="text-xl font-black text-slate-950">{txt.visual}</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{(['logo_url', 'banner_url', 'profile_image_url'] as const).map((field) => <div key={field} className="rounded-2xl border border-slate-200 p-4"><b className="text-sm text-slate-800">{field === 'logo_url' ? txt.logo : field === 'banner_url' ? txt.banner : txt.profile}</b><div className="mt-3 aspect-video overflow-hidden rounded-xl bg-slate-100">{ipForm[field] ? <Image src={ipForm[field]} alt="IP asset" width={600} height={360} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>}</div><div className="mt-3">{uploadControl(field)}</div></div>)}</div><div className="mt-4 grid gap-4 md:grid-cols-4">{statusSelect(ipForm.development_status, (v) => setIpForm((p: any) => ({ ...p, development_status: v })))}{textInput(txt.order, String(ipForm.sort_order ?? 0), (v) => setIpForm((p: any) => ({ ...p, sort_order: Number(v || 0) })), { type: 'number' })}{textInput(zh ? '主颜色' : '메인 컬러', ipForm.color_primary, (v) => setIpForm((p: any) => ({ ...p, color_primary: v })), { type: 'color' })}{textInput(zh ? '辅助颜色' : '보조 컬러', ipForm.color_secondary, (v) => setIpForm((p: any) => ({ ...p, color_secondary: v })), { type: 'color' })}</div></section>
            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-6"><button disabled={saving} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? txt.saving : txt.save}</button><button type="button" onClick={() => { setSelectedId(null); setIpForm(emptyIp()); }} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700">{txt.clear}</button>{selected && <button type="button" onClick={() => void archiveItem('ip', selected.id)} className="min-h-11 rounded-xl border border-rose-200 px-5 text-sm font-bold text-rose-700">{txt.archive}</button>}</div>
          </form>}
          {tab === 'cast' && selectedId && <div className="space-y-7"><form onSubmit={(event) => void submitCast(event)} className="rounded-2xl bg-slate-50 p-4 md:p-5"><h2 className="text-lg font-black text-slate-950">{txt.addCast}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{textInput(`${txt.name} · ${txt.ko}`, castForm.name_ko, (v) => setCastForm((p: any) => ({ ...p, name_ko: v })), { required: true })}{textInput(`${txt.name} · ${txt.zhLabel}`, castForm.name_zh, (v) => setCastForm((p: any) => ({ ...p, name_zh: v })))}{textInput(txt.slug, castForm.slug, (v) => setCastForm((p: any) => ({ ...p, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') })), { required: true })}{textInput(`${txt.role} · ${txt.ko}`, castForm.role_ko, (v) => setCastForm((p: any) => ({ ...p, role_ko: v })))}{textArea(`${txt.profileText} · ${txt.ko}`, castForm.profile_ko, (v) => setCastForm((p: any) => ({ ...p, profile_ko: v })))}{textArea(`${txt.profileText} · ${txt.zhLabel}`, castForm.profile_zh, (v) => setCastForm((p: any) => ({ ...p, profile_zh: v })))}</div><div className="mt-4 flex flex-wrap items-end gap-4">{uploadControl('cast')}{statusSelect(castForm.publication_status, (v) => setCastForm((p: any) => ({ ...p, publication_status: v })))}<button disabled={saving} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? txt.saving : txt.save}</button><button type="button" onClick={() => { setCastForm(emptyCast()); setEditingCastId(null); }} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700">{txt.clear}</button></div></form><div className="grid gap-3">{castItems.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">{txt.noCast}</p> : castItems.map((item) => <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100">{item.profile_image_url ? <Image src={item.profile_image_url} width={128} height={128} alt={item.name_ko} className="h-full w-full object-contain" /> : null}</div><div className="min-w-0 flex-1"><b className="block text-slate-950">{zh && item.name_zh ? item.name_zh : item.name_ko}</b><p className="mt-1 text-sm text-slate-500">{zh && item.role_zh ? item.role_zh : item.role_ko}</p></div><span className="text-xs font-bold text-slate-500">{item.publication_status}</span><div className="flex gap-2"><button onClick={() => { setCastForm(item); setEditingCastId(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">{txt.edit}</button><button onClick={() => void archiveItem('cast', item.id)} className="min-h-10 rounded-lg border border-rose-200 px-3 text-sm font-bold text-rose-700">{txt.delete}</button></div></article>)}</div></div>}
          {tab === 'content' && selectedId && <div className="space-y-7"><form onSubmit={(event) => void submitContent(event)} className="rounded-2xl bg-slate-50 p-4 md:p-5"><h2 className="text-lg font-black text-slate-950">{txt.addContent}</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-slate-700"><span>{txt.type}</span><select value={contentForm.content_type} onChange={(e) => setContentForm((p: any) => ({ ...p, content_type: e.target.value }))} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="storybook">{zh ? '童话' : '동화'}</option><option value="webtoon">{zh ? '网漫' : '웹툰'}</option><option value="novel">{zh ? '小说' : '소설'}</option><option value="shortform">{zh ? '短视频' : '숏폼'}</option><option value="news">{zh ? '消息' : '소식'}</option></select></label>{textInput(txt.episode, contentForm.episode_no ? String(contentForm.episode_no) : '', (v) => setContentForm((p: any) => ({ ...p, episode_no: v ? Number(v) : null })), { type: 'number' })}{textInput(`${txt.titleLabel} · ${txt.ko}`, contentForm.title_ko, (v) => setContentForm((p: any) => ({ ...p, title_ko: v })), { required: true })}{textInput(`${txt.titleLabel} · ${txt.zhLabel}`, contentForm.title_zh, (v) => setContentForm((p: any) => ({ ...p, title_zh: v })))}{textInput(txt.slug, contentForm.slug, (v) => setContentForm((p: any) => ({ ...p, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') })), { required: true })}{statusSelect(contentForm.publication_status, (v) => setContentForm((p: any) => ({ ...p, publication_status: v })))}{textArea(`${txt.excerpt} · ${txt.ko}`, contentForm.excerpt_ko, (v) => setContentForm((p: any) => ({ ...p, excerpt_ko: v })))}{textArea(`${txt.excerpt} · ${txt.zhLabel}`, contentForm.excerpt_zh, (v) => setContentForm((p: any) => ({ ...p, excerpt_zh: v })))}</div><div className="mt-4 grid gap-4 md:grid-cols-2">{textArea(`${txt.body} · ${txt.ko}`, contentForm.body_ko, (v) => setContentForm((p: any) => ({ ...p, body_ko: v })), 10)}{textArea(`${txt.body} · ${txt.zhLabel}`, contentForm.body_zh, (v) => setContentForm((p: any) => ({ ...p, body_zh: v })), 10)}</div><div className="mt-4 flex flex-wrap items-end gap-4">{uploadControl('content')}<span className="text-xs text-slate-500">{contentForm.cover_asset_id ? `${txt.cover}: ${txt.uploaded}` : txt.cover}</span><button disabled={saving} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? txt.saving : txt.save}</button><button type="button" onClick={() => { setContentForm(emptyContent()); setEditingContentId(null); }} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700">{txt.clear}</button></div></form><div className="grid gap-3">{contentItems.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">{txt.noContent}</p> : contentItems.map((item) => <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><b className="block truncate text-slate-950">{zh && item.title_zh ? item.title_zh : item.title_ko}</b><p className="mt-1 text-sm text-slate-500">{item.content_type}{item.episode_no ? ` · ${txt.episode} ${item.episode_no}` : ''}</p></div><span className="text-xs font-bold text-slate-500">{item.publication_status}</span><div className="flex gap-2"><button onClick={() => { setContentForm(item); setEditingContentId(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700">{txt.edit}</button><button onClick={() => void archiveItem('content', item.id)} className="min-h-10 rounded-lg border border-rose-200 px-3 text-sm font-bold text-rose-700">{txt.delete}</button></div></article>)}</div></div>}
          {tab === 'guide' && <div className="max-w-3xl space-y-5"><h2 className="text-xl font-black text-slate-950">{txt.guide}</h2><div className="rounded-2xl bg-indigo-50 p-5 text-sm leading-7 text-indigo-950"><p className="font-bold">{zh ? '登记顺序' : '등록 순서'}</p><p className="mt-2">{zh ? '先建立IP基本资料与世界观，直接上传代表图片，然后登记角色与连载内容。保存为草稿时公开页面不显示；确认后改为公开即可立即反映。' : '먼저 IP 기본 정보와 세계관을 등록하고 대표 이미지를 직접 첨부한 다음 캐릭터와 연재 콘텐츠를 등록합니다. 초안은 공개 페이지에 보이지 않으며, 확인 후 공개로 변경하면 즉시 반영됩니다.'}</p></div><div className="rounded-2xl border border-slate-200 p-5 text-sm leading-7 text-slate-600"><p className="font-bold text-slate-900">{zh ? '安全原则' : '운영 원칙'}</p><p className="mt-2">{zh ? '归档不会物理删除数据。每次创建、修改、公开与归档都会记录在运营日志。公开IP页面只读取已公开数据。' : '보관은 물리 삭제가 아니므로 기록을 보존합니다. 등록·수정·공개·보관 활동은 운영 이력에 남으며, 공개 IP 페이지는 공개 상태 데이터만 읽습니다.'}</p></div></div>}
        </div>
      </main>
    </div>
  </div>;
}
