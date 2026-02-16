import { StatsData, ProcessedData, ResultData } from '../types';
import { normalizeTitle, addWithRounding } from '../utils';

export const processRidibooksMonthData = (
  statsData: StatsData[],
  resultData: ResultData[],
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly'
): ProcessedData => {
  // 결과 파일에서 주요 제목들 추출 (소설/웹툰 별도 관리)
  const majorNovelTitles = new Set<string>();
  const majorWebtoonTitles = new Set<string>();
  const novelTitlesMapping = new Map<string, string>(); // 정리된 제목 → 원본 제목 (주요 + 기타)
  const webtoonTitlesMapping = new Map<string, string>(); // 정리된 제목 → 원본 제목 (주요 + 기타)
  
  // 리디북스 월간: 첫 번째 열에 소설 제목들, 여섯 번째 열에 웹툰 제목들
  // console.log('리디북스 월간 resultData:', resultData);
  // console.log('resultData 길이:', resultData.length);
  
  // 소설 제목들 (첫 번째 열)
  resultData.forEach((row: any, rowIndex: number) => {
    if (row && Array.isArray(row) && row[0]) {
      const title = String(row[0]).trim();
      // 더 엄격한 필터링: 실제 제목만 포함
      if (title && 
          title !== '' && 
          title !== '소설' && 
          title !== '기타' && 
          title !== '합계' &&
          title !== '기타 소설' &&
          !title.startsWith('기타') &&
          title.length > 1) { // 한 글자 제목 제외
        const originalTitle = title;
        const normalizedTitle = normalizeTitle(originalTitle, platform);
        majorNovelTitles.add(normalizedTitle);
        novelTitlesMapping.set(normalizedTitle, originalTitle);
      }
    }
  });
  
  // 웹툰 제목들 (여섯 번째 열)
  resultData.forEach((row: any, rowIndex: number) => {
    if (row && Array.isArray(row) && row[5]) {
      const title = String(row[5]).trim();
      // 더 엄격한 필터링: 실제 제목만 포함
      if (title && 
          title !== '' && 
          title !== '웹툰' && 
          title !== '기타' && 
          title !== '합계' &&
          title !== '기타 웹툰' &&
          !title.startsWith('기타') &&
          title.length > 1) { // 한 글자 제목 제외
        const originalTitle = title;
        const normalizedTitle = normalizeTitle(originalTitle, platform);
        majorWebtoonTitles.add(normalizedTitle);
        webtoonTitlesMapping.set(normalizedTitle, originalTitle);
      }
    }
  });

  console.log('=== 리디북스 월간 제목 추출 결과 ===');
  console.log('주요 소설 제목들:', Array.from(majorNovelTitles));
  console.log('주요 웹툰 제목들:', Array.from(majorWebtoonTitles));
  console.log('소설 제목 개수:', majorNovelTitles.size);
  console.log('웹툰 제목 개수:', majorWebtoonTitles.size);
  console.log('==============================');

  const majorNovelTitlesSums: { [title: string]: number } = {};
  const majorWebtoonTitlesSums: { [title: string]: number } = {};
  const etcTitlesSums: { [title: string]: number } = {};
  const etcWebtoonTitlesSums: { [title: string]: number } = {};
  let etcTotal = 0;
  let etcWebtoonTotal = 0;
  let total = 0;
  let webtoonTotal = 0;
  
  // 리디북스 월간용 income 필드들
  const majorNovelTitlesIncome: { [title: string]: number } = {};
  const majorWebtoonTitlesIncome: { [title: string]: number } = {};
  const etcTitlesIncome: { [title: string]: number } = {};
  const etcWebtoonTitlesIncome: { [title: string]: number } = {};
  let etcTotalIncome = 0;
  let etcWebtoonTotalIncome = 0;
  let totalIncome = 0;
  let webtoonTotalIncome = 0;

  // 통계 데이터 처리 - 정리된 제목으로 합산
  statsData.forEach((row: any) => {
    if (!row.title) return;

    const title = normalizeTitle(row.title, platform);
    const revenue = row.revenue || 0;
    const income = row.income || 0;
    const isWebtoon = row.isWebtoon || false; // 리디북스에서만 사용

    // 리디북스 월간: 소설/웹툰 별도 처리 (CSV의 isWebtoon 플래그 사용)
    if (isWebtoon && majorWebtoonTitles.has(title)) {
      majorWebtoonTitlesSums[title] = addWithRounding(majorWebtoonTitlesSums[title] || 0, revenue);
      majorWebtoonTitlesIncome[title] = addWithRounding(majorWebtoonTitlesIncome[title] || 0, income);
      // console.log(`✅ 웹툰 매칭: ${title} → (+${revenue})`);
      webtoonTotal = addWithRounding(webtoonTotal, revenue);
      webtoonTotalIncome = addWithRounding(webtoonTotalIncome, income);
    } else if (!isWebtoon && majorNovelTitles.has(title)) {
      majorNovelTitlesSums[title] = addWithRounding(majorNovelTitlesSums[title] || 0, revenue);
      majorNovelTitlesIncome[title] = addWithRounding(majorNovelTitlesIncome[title] || 0, income);
      // console.log(`✅ 소설 매칭: ${title} → (+${revenue})`);
      total = addWithRounding(total, revenue);
      totalIncome = addWithRounding(totalIncome, income);
      // console.log(`title: ${title}, revenue: ${revenue}, total: ${total}`);
    } else {
      // 기타로 분류
      if (isWebtoon) {
        etcWebtoonTitlesSums[title] = addWithRounding(etcWebtoonTitlesSums[title] || 0, revenue);
        etcWebtoonTitlesIncome[title] = addWithRounding(etcWebtoonTitlesIncome[title] || 0, income);
        etcWebtoonTotal = addWithRounding(etcWebtoonTotal, revenue);
        etcWebtoonTotalIncome = addWithRounding(etcWebtoonTotalIncome, income);
        webtoonTotal = addWithRounding(webtoonTotal, revenue);
        webtoonTotalIncome = addWithRounding(webtoonTotalIncome, income);
        // 기타 웹툰 mapping에 저장
        if (!webtoonTitlesMapping.has(title)) {
          webtoonTitlesMapping.set(title, row.title);
        }
        // console.log(`📦 웹툰 기타: ${title} (+${revenue})`);
      } else {
        etcTitlesSums[title] = addWithRounding(etcTitlesSums[title] || 0, revenue);
        etcTitlesIncome[title] = addWithRounding(etcTitlesIncome[title] || 0, income);

        console.log(`title: ${row.title}, revenue: ${etcTitlesSums[title]}, income: ${etcTitlesIncome[title]}`);
        etcTotal = addWithRounding(etcTotal, revenue);
        etcTotalIncome = addWithRounding(etcTotalIncome, income);
        total = addWithRounding(total, revenue);
        totalIncome = addWithRounding(totalIncome, income);
        // 기타 소설 mapping에 저장
        if (!novelTitlesMapping.has(title)) {
          novelTitlesMapping.set(title, row.title);
        }
      }
    }
  });
  
  // console.log('주요 소설 제목 합계:', majorNovelTitlesSums);
  // console.log('주요 웹툰 제목 합계:', majorWebtoonTitlesSums);
  // console.log('기타 소설 제목별 합계:', etcTitlesSums);
  // console.log('기타 웹툰 제목별 합계:', etcWebtoonTitlesSums);
  // console.log('기타 소설 총합:', etcTotal);
  // console.log('기타 웹툰 총합:', etcWebtoonTotal);
  // console.log('전체 소설 총합:', total);
  // console.log('전체 웹툰 총합:', webtoonTotal);

  const result = {
    majorTitles: majorNovelTitlesSums,
    majorWebtoonTitles: majorWebtoonTitlesSums,
    etcTitles: etcTitlesSums,
    etcWebtoonTitles: etcWebtoonTitlesSums,
    etcTotal: etcTotal,
    etcWebtoonTotal: etcWebtoonTotal,
    total: total,
    totalWebtoon: webtoonTotal,
    // 리디북스 월간용 income 필드들
    majorTitlesIncome: majorNovelTitlesIncome,
    majorWebtoonTitlesIncome: majorWebtoonTitlesIncome,
    etcTitlesIncome: etcTitlesIncome,
    etcWebtoonTitlesIncome: etcWebtoonTitlesIncome,
    etcTotalIncome: etcTotalIncome,
    etcWebtoonTotalIncome: etcWebtoonTotalIncome,
    totalIncome: totalIncome,
    totalWebtoonIncome: webtoonTotalIncome,
    platform: platform,
    titleMappings: Object.fromEntries(novelTitlesMapping),
    webtoonTitleMappings: Object.fromEntries(webtoonTitlesMapping),
  };
  
  // console.log('처리 결과:', result);
  return result;
}; 