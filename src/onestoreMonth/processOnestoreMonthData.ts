import { StatsData, ProcessedData, ResultData } from '../types';
import { normalizeTitle } from '../utils';

export const processOnestoreMonthData = (
  statsData: StatsData[],
  resultData: ResultData[],
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly'
): ProcessedData => {
  // 결과 파일에서 주요 제목들 추출
  const majorTitles = new Set<string>();
  const titlesMapping = new Map<string, string>();

  // A열(첫 번째 열)에서 제목들 추출 (3번째 row부터)
  resultData.forEach((row: any, rowIndex: number) => {
    if (rowIndex >= 2 && row && Array.isArray(row) && row[0]) {
      const title = String(row[0]).trim();
      if (title && title !== '제목' && title !== '기타' && title !== '합계') {
        const normalizedTitle = normalizeTitle(title, platform);
        majorTitles.add(normalizedTitle);
        titlesMapping.set(normalizedTitle, title);
      }
    }
  });

  const majorTitlesSums: { [title: string]: number } = {};
  const majorTitlesIncome: { [title: string]: number } = {};
  const etcTitlesSums: { [title: string]: number } = {};
  const etcTitlesIncome: { [title: string]: number } = {};
  let etcTotal = 0;
  let etcTotalIncome = 0;
  let total = 0;
  let totalIncome = 0;

  // 통계 데이터 처리
  statsData.forEach((row: any) => {
    if (!row.title) return;

    const title = normalizeTitle(row.title, platform);
    const revenue = row.revenue || 0;
    const income = row.income || 0;

    if (majorTitles.has(title)) {
      majorTitlesSums[title] = (majorTitlesSums[title] || 0) + revenue;
      majorTitlesIncome[title] = (majorTitlesIncome[title] || 0) + income;
    } else {
      etcTitlesSums[title] = (etcTitlesSums[title] || 0) + revenue;
      etcTitlesIncome[title] = (etcTitlesIncome[title] || 0) + income;
      
      if (!titlesMapping.has(title)) {
        titlesMapping.set(title, row.title);
      }
    }
  });

  // Round all values at the end
  Object.keys(majorTitlesSums).forEach(key => {
    majorTitlesSums[key] = Math.round(majorTitlesSums[key])
    total += majorTitlesSums[key]
  });
  Object.keys(majorTitlesIncome).forEach(key => {
    majorTitlesIncome[key] = Math.round(majorTitlesIncome[key])
    totalIncome += majorTitlesIncome[key]
  });
  Object.keys(etcTitlesSums).forEach(key => {
    etcTitlesSums[key] = Math.round(etcTitlesSums[key])
    etcTotal += etcTitlesSums[key]
  });
  Object.keys(etcTitlesIncome).forEach(key => {
    etcTitlesIncome[key] = Math.round(etcTitlesIncome[key])
    etcTotalIncome += etcTitlesIncome[key]
  });

  return {
    majorTitles: majorTitlesSums,
    etcTitles: etcTitlesSums,
    etcTotal: etcTotal,
    total: total,
    majorTitlesIncome: majorTitlesIncome,
    etcTitlesIncome: etcTitlesIncome,
    etcTotalIncome: etcTotalIncome,
    totalIncome: totalIncome,
    platform: platform,
    titleMappings: Object.fromEntries(titlesMapping)
  };
};