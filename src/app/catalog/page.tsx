'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLangContext } from '@/components/layout/LangContext';

// ─── IP 캐릭터 정의 ───────────────────────────────────────────────
const IP_CHARACTERS = [
  { id: 'all', ko: '전체', zh: '全部', color: '' },
  { id: 'gilduck', ko: '길덕이', zh: '吉鸭', color: '#4FC3F7' },
  { id: 'inyeoseok', ko: '이녀석', zh: '这家伙', color: '#FF8A65' },
  { id: 'kkomul', ko: '꼬물이들', zh: '小怪物们', color: '#AB47BC' },
  { id: 'heartbbung', ko: '하트뿅 햄스터', zh: '心动仓鼠', color: '#FFB74D' },
  { id: 'piggly', ko: '피글리', zh: '小猪猪', color: '#F48FB1' },
];

// ─── 카테고리 정의 ───────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all', ko: '전체', zh: '全部', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { id: 'plush', ko: '인형/봉제', zh: '毛绒玩具', icon: 'M12 21a9 9 0 110-18 9 9 0 010 18z' },
  { id: 'keyring', ko: '키링/가방고리', zh: '钥匙扣/包挂件', icon: 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z' },
  { id: 'figure', ko: '피규어', zh: '手办', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0' },
  { id: 'gacha', ko: '뽑기 굿즈', zh: '扭蛋商品', icon: 'M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z' },
];

// ─── 상품 데이터 (IP 굿즈) ───────────────────────────────────────
interface CatalogProduct {
  id: string;
  name_ko: string;
  name_zh: string;
  category: string;
  ip: string;
  image: string;
  price_range: string;
  moq: number;
  description_ko: string;
  description_zh: string;
  is_new: boolean;
  is_hot: boolean;
}

const CATALOG_PRODUCTS: CatalogProduct[] = [
  // 길덕이
  { id: 'GD-PL-001', name_ko: '길덕이 봉제인형 30cm', name_zh: '吉鸭毛绒公仔 30cm', category: 'plush', ip: 'gilduck', image: '/images/catalog-goods/gilduck-plush.webp', price_range: '¥18~25', moq: 500, description_ko: '변신천재 유연한 오리 길덕이 대형 봉제인형', description_zh: '变身天才柔软鸭吉鸭大型毛绒公仔', is_new: true, is_hot: true },
  { id: 'GD-KR-001', name_ko: '길덕이 봉제 키링', name_zh: '吉鸭毛绒钥匙扣', category: 'keyring', ip: 'gilduck', image: '/images/catalog-goods/gilduck-keyring.webp', price_range: '¥5~8', moq: 1000, description_ko: '가방에 달면 시선 집중! 길덕이 미니 봉제 키링', description_zh: '挂在包上超吸睛！吉鸭迷你毛绒钥匙扣', is_new: true, is_hot: false },
  { id: 'GD-FG-001', name_ko: '길덕이 아트토이 피규어', name_zh: '吉鸭艺术玩具手办', category: 'figure', ip: 'gilduck', image: '/images/catalog-goods/gilduck-figure.webp', price_range: '¥22~30', moq: 300, description_ko: '비닐 소재 프리미엄 아트토이 컬렉션', description_zh: '乙烯基材质高端艺术玩具收藏品', is_new: true, is_hot: false },
  { id: 'GD-GA-001', name_ko: '길덕이 가챠 캡슐 시리즈', name_zh: '吉鸭扭蛋胶囊系列', category: 'gacha', ip: 'gilduck', image: '/images/catalog-goods/gilduck-gacha.webp', price_range: '¥3~5', moq: 2000, description_ko: '4종 랜덤 캡슐 피규어 (뽑기기계용)', description_zh: '4款随机胶囊手办（适用扭蛋机）', is_new: false, is_hot: true },

  // 이녀석
  { id: 'IN-PL-001', name_ko: '이녀석 봉제 키링 세트 (9종)', name_zh: '这家伙毛绒钥匙扣套装 (9款)', category: 'plush', ip: 'inyeoseok', image: '/images/catalog-goods/inyeoseok-plush.webp', price_range: '¥4~6', moq: 1000, description_ko: '재미있는 낙서 캐릭터 9종 봉제 키링 세트', description_zh: '有趣涂鸦角色9款毛绒钥匙扣套装', is_new: true, is_hot: true },
  { id: 'IN-KR-001', name_ko: '이녀석 아크릴 키링 세트', name_zh: '这家伙亚克力钥匙扣套装', category: 'keyring', ip: 'inyeoseok', image: '/images/catalog-goods/inyeoseok-keyring.webp', price_range: '¥2~4', moq: 2000, description_ko: '투명 아크릴 키링 (랜덤 3종)', description_zh: '透明亚克力钥匙扣（随机3款）', is_new: true, is_hot: false },
  { id: 'IN-FG-001', name_ko: '이녀석 블라인드박스 피규어', name_zh: '这家伙盲盒手办', category: 'figure', ip: 'inyeoseok', image: '/images/catalog-goods/inyeoseok-figure.webp', price_range: '¥8~12', moq: 500, description_ko: '5종 미니 비닐 피규어 블라인드박스', description_zh: '5款迷你乙烯基手办盲盒', is_new: false, is_hot: true },
  { id: 'IN-GA-001', name_ko: '이녀석 미스터리백 굿즈', name_zh: '这家伙神秘袋周边', category: 'gacha', ip: 'inyeoseok', image: '/images/catalog-goods/inyeoseok-gacha.webp', price_range: '¥3~5', moq: 2000, description_ko: '아크릴 스탠드 + 미스터리백 (5종 랜덤)', description_zh: '亚克力立牌 + 神秘袋（5款随机）', is_new: true, is_hot: false },

  // 꼬물이들
  { id: 'KM-PL-001', name_ko: '꼬물이들 봉제인형 25cm', name_zh: '小怪物们毛绒公仔 25cm', category: 'plush', ip: 'kkomul', image: '/images/catalog-goods/kkomul-plush.webp', price_range: '¥15~20', moq: 500, description_ko: '우주에서 온 보라색 몬스터 대형 봉제인형', description_zh: '来自宇宙的紫色怪物大型毛绒公仔', is_new: true, is_hot: true },
  { id: 'KM-KR-001', name_ko: '꼬물이들 아크릴 키링', name_zh: '小怪物们亚克力钥匙扣', category: 'keyring', ip: 'kkomul', image: '/images/catalog-goods/kkomul-keyring.webp', price_range: '¥3~5', moq: 1500, description_ko: '별 장식 아크릴 키링 (초승달 뿔 디자인)', description_zh: '星星装饰亚克力钥匙扣（新月角设计）', is_new: true, is_hot: false },
  { id: 'KM-FG-001', name_ko: '꼬물이들 블라인드박스 4종', name_zh: '小怪物们盲盒4款', category: 'figure', ip: 'kkomul', image: '/images/catalog-goods/kkomul-figure.webp', price_range: '¥12~18', moq: 300, description_ko: '4가지 포즈 비닐 피규어 블라인드박스', description_zh: '4种姿势乙烯基手办盲盒', is_new: true, is_hot: true },
  { id: 'KM-GA-001', name_ko: '꼬물이들 가챠 시리즈', name_zh: '小怪物们扭蛋系列', category: 'gacha', ip: 'kkomul', image: '/images/catalog-goods/kkomul-gacha.webp', price_range: '¥4~6', moq: 2000, description_ko: '우주 몬스터 4종 캡슐 피규어', description_zh: '宇宙怪物4款胶囊手办', is_new: false, is_hot: true },

  // 하트뿅 햄스터
  { id: 'HB-PL-001', name_ko: '하트뿅 햄스터 봉제인형', name_zh: '心动仓鼠毛绒公仔', category: 'plush', ip: 'heartbbung', image: '/images/catalog-goods/heartbbung-plush.webp', price_range: '¥14~20', moq: 500, description_ko: '핑거하트 포즈 사랑스러운 햄스터 인형', description_zh: '比心姿势可爱仓鼠公仔', is_new: true, is_hot: true },
  { id: 'HB-KR-001', name_ko: '하트뿅 햄스터 봉제 키링', name_zh: '心动仓鼠毛绒钥匙扣', category: 'keyring', ip: 'heartbbung', image: '/images/catalog-goods/heartbbung-keyring.webp', price_range: '¥5~8', moq: 1000, description_ko: '미니 사이즈 핑거하트 햄스터 키링', description_zh: '迷你尺寸比心仓鼠钥匙扣', is_new: true, is_hot: false },
  { id: 'HB-FG-001', name_ko: '하트뿅 햄스터 피규어 컬렉션', name_zh: '心动仓鼠手办收藏', category: 'figure', ip: 'heartbbung', image: '/images/catalog-goods/heartbbung-figure.webp', price_range: '¥10~15', moq: 500, description_ko: '3종 포즈 (핑거하트, 딸기, 잠자기)', description_zh: '3种姿势（比心、草莓、睡觉）', is_new: true, is_hot: false },
  { id: 'HB-GA-001', name_ko: '하트뿅 햄스터 가챠 세트', name_zh: '心动仓鼠扭蛋套装', category: 'gacha', ip: 'heartbbung', image: '/images/catalog-goods/heartbbung-gacha.webp', price_range: '¥3~5', moq: 2000, description_ko: '3종 미니 피규어 캡슐 (뽑기기계용)', description_zh: '3款迷你手办胶囊（适用扭蛋机）', is_new: false, is_hot: true },

  // 피글리
  { id: 'PG-PL-001', name_ko: '피글리 봉제인형 20cm', name_zh: '小猪猪毛绒公仔 20cm', category: 'plush', ip: 'piggly', image: '/images/catalog-goods/piggly-plush.webp', price_range: '¥12~18', moq: 500, description_ko: '동글동글 귀여운 돼지 봉제인형', description_zh: '圆滚滚可爱小猪毛绒公仔', is_new: true, is_hot: true },
  { id: 'PG-KR-001', name_ko: '피글리 봉제 키링', name_zh: '小猪猪毛绒钥匙扣', category: 'keyring', ip: 'piggly', image: '/images/catalog-goods/piggly-keyring.webp', price_range: '¥4~6', moq: 1000, description_ko: '미니 동글 피글리 봉제 키링', description_zh: '迷你圆滚小猪猪毛绒钥匙扣', is_new: true, is_hot: false },
  { id: 'PG-FG-001', name_ko: '피글리 블라인드박스 4종', name_zh: '小猪猪盲盒4款', category: 'figure', ip: 'piggly', image: '/images/catalog-goods/piggly-figure.webp', price_range: '¥10~15', moq: 300, description_ko: '4가지 포즈 비닐 피규어 (앉기, 눕기, 담요, 뒷모습)', description_zh: '4种姿势乙烯基手办（坐、躺、毯子、背影）', is_new: true, is_hot: true },
  { id: 'PG-GA-001', name_ko: '피글리 가챠 캡슐 시리즈', name_zh: '小猪猪扭蛋胶囊系列', category: 'gacha', ip: 'piggly', image: '/images/catalog-goods/piggly-gacha.webp', price_range: '¥3~5', moq: 2000, description_ko: '4종 랜덤 캡슐 피규어 (뽑기기계용)', description_zh: '4款随机胶囊手办（适用扭蛋机）', is_new: false, is_hot: true },
];

export default function CatalogPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ipFilter, setIpFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  // 필터링
  const filteredProducts = CATALOG_PRODUCTS.filter(p => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (ipFilter !== 'all' && p.ip !== ipFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                {t('홈', '首页')}
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                {t('IP 굿즈 카탈로그', 'IP周边商品目录')}
              </h1>
              <span className="text-sm text-gray-500">
                {t(`${filteredProducts.length}개 상품`, `${filteredProducts.length} 件商品`)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 사이드 필터 */}
          <aside className="w-56 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-xl shadow-sm p-5 sticky top-24">
              {/* 카테고리 필터 */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-3">{t('카테고리', '分类')}</h3>
                <div className="space-y-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        categoryFilter === cat.id
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={cat.icon} />
                      </svg>
                      {t(cat.ko, cat.zh)}
                    </button>
                  ))}
                </div>
              </div>

              {/* IP 캐릭터 필터 */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">{t('IP 캐릭터', 'IP角色')}</h3>
                <div className="space-y-1">
                  {IP_CHARACTERS.map(ip => (
                    <button
                      key={ip.id}
                      onClick={() => setIpFilter(ip.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        ipFilter === ip.id
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {ip.color && (
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ip.color }} />
                      )}
                      {t(ip.ko, ip.zh)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* 모바일 필터 */}
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-20 bg-white rounded-xl shadow-lg border p-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    categoryFilter === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t(cat.ko, cat.zh)}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto mt-2">
              {IP_CHARACTERS.map(ip => (
                <button
                  key={ip.id}
                  onClick={() => setIpFilter(ip.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                    ipFilter === ip.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {ip.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ip.color }} />}
                  {t(ip.ko, ip.zh)}
                </button>
              ))}
            </div>
          </div>

          {/* 상품 그리드 */}
          <main className="flex-1 min-w-0">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-lg">{t('조건에 맞는 상품이 없습니다', '没有符合条件的商品')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => {
                  const ipInfo = IP_CHARACTERS.find(ip => ip.id === product.ip);
                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {/* 이미지 */}
                      <div className="aspect-square relative bg-gray-50 overflow-hidden">
                        <Image
                          src={product.image}
                          alt={t(product.name_ko, product.name_zh)}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        />
                        {/* 배지 */}
                        <div className="absolute top-2 left-2 flex gap-1">
                          {product.is_new && (
                            <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">NEW</span>
                          )}
                          {product.is_hot && (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">HOT</span>
                          )}
                        </div>
                        {/* IP 태그 */}
                        {ipInfo && (
                          <div
                            className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-medium text-white"
                            style={{ backgroundColor: ipInfo.color }}
                          >
                            {t(ipInfo.ko, ipInfo.zh)}
                          </div>
                        )}
                      </div>
                      {/* 정보 */}
                      <div className="p-3">
                        <p className="text-[10px] text-gray-400 mb-1">{product.id}</p>
                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-2">
                          {t(product.name_ko, product.name_zh)}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-700 font-bold text-sm">{product.price_range}</span>
                          <span className="text-[10px] text-gray-400">MOQ {product.moq}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 상품 상세 모달 */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* 모달 이미지 */}
            <div className="aspect-square relative bg-gray-50">
              <Image
                src={selectedProduct.image}
                alt={t(selectedProduct.name_ko, selectedProduct.name_zh)}
                fill
                className="object-cover rounded-t-2xl"
                sizes="500px"
              />
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:bg-white shadow"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 모달 정보 */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">{selectedProduct.id}</span>
                {selectedProduct.is_new && <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">NEW</span>}
                {selectedProduct.is_hot && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">HOT</span>}
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {t(selectedProduct.name_ko, selectedProduct.name_zh)}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {t(selectedProduct.description_ko, selectedProduct.description_zh)}
              </p>

              {/* 스펙 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">{t('단가 범위', '单价范围')}</p>
                  <p className="font-bold text-indigo-700 text-lg">{selectedProduct.price_range}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">{t('최소주문량', '最低起订量')}</p>
                  <p className="font-bold text-gray-800 text-lg">{selectedProduct.moq}{t('개', '件')}</p>
                </div>
              </div>

              {/* IP 정보 */}
              {(() => {
                const ipInfo = IP_CHARACTERS.find(ip => ip.id === selectedProduct.ip);
                return ipInfo ? (
                  <div className="flex items-center gap-2 mb-4 bg-gray-50 rounded-lg p-3">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: ipInfo.color }} />
                    <span className="text-sm font-medium text-gray-700">
                      {t(ipInfo.ko, ipInfo.zh)}
                    </span>
                    <span className="text-xs text-gray-400">IP</span>
                  </div>
                ) : null;
              })()}

              {/* OEM 가능 */}
              <div className="flex gap-2 flex-wrap mb-4">
                <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-medium">OEM {t('가능', '可定制')}</span>
                <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">{t('커스텀 가능', '可定制')}</span>
              </div>

              {/* 문의 버튼 */}
              <Link
                href="/login"
                className="block w-full py-3 rounded-xl font-semibold text-sm text-center bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                {t('이 상품으로 진행하기', '用这个商品开始合作')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
