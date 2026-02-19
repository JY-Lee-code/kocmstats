import { StatsData } from './types';

export const normalizeTitle = (title: string, platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly' = 'naver'): string => {
  if (!title) return '';
  
  let normalized = title.toString().trim();
  // [e북], [단행본], [독점] 등 모든 대괄호 텍스트 제거
  normalized = normalized.replace(/\s*\[.*?\]/g, '');
  // 숫자+권 형식 제거 (예: "31권", "1권" 등)
  normalized = normalized.replace(/\s*\d+권/g, '');
  // (부제) 제거
  normalized = normalized.replace(/\s*\([^)]*\)$/, '');
  // 공백 정리
  normalized = normalized.replace(/\s+/g, '').toLowerCase();

  return normalized;
};

export const formatRevenue = (revenue: number): string => {
  return revenue.toLocaleString() + '원';
};

export const formatRevenueWithSign = (revenue: number): string => {
  const sign = revenue >= 0 ? '+' : '';
  return sign + formatRevenue(revenue);
};

export const sortByRevenue = (a: [string, number], b: [string, number]): number => {
  return b[1] - a[1];
};

export const isElectron = (): boolean => {
  return window.electronAPI !== undefined;
};

/**
 * 소수점 둘째자리까지 반올림하여 합산
 * @param currentTotal 현재까지의 합계
 * @param newValue 새로 추가할 값
 * @returns 반올림된 합계
 */
export const addWithRounding = (currentTotal: number, newValue: number): number => {
  return Math.round((currentTotal + newValue) * 100) / 100;
};

/**
 * 천 단위 쉼표 추가 함수 (오른쪽 정렬 스타일 포함)
 * @param num 숫자
 * @returns 스타일이 포함된 셀 객체
 */
export const formatNumber = (num: number): any => {
  const formattedValue = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return {
    v: formattedValue,
    s: { alignment: { horizontal: 'right' } }
  };
}; 