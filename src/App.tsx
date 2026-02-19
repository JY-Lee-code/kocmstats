import React, { useState, useEffect } from 'react';
import './App.css';
import { ProcessedData, StatsData, ResultData } from './types';
import { loadStatsFile, loadResultFile, processData, saveResults } from './fileProcessors';
import { formatRevenueWithSign, sortByRevenue, isElectron } from './utils';

// 파일명 추출 함수
const getFileName = (filePath: string): string => {
  return filePath.split(/[/\\]/).pop() || filePath;
};

const App: React.FC = () => {
  const [statsFilePath, setStatsFilePath] = useState<string>('');
  const [resultFilePath, setResultFilePath] = useState<string>('');
  const [statsFileName, setStatsFileName] = useState<string>('');
  const [resultFileName, setResultFileName] = useState<string>('');
  const [platform, setPlatform] = useState<'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly'>('naver');
  const [statsData, setStatsData] = useState<StatsData[]>([]);
  const [resultData, setResultData] = useState<ResultData[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [dragOverStats, setDragOverStats] = useState(false);
  const [dragOverResult, setDragOverResult] = useState(false);

  useEffect(() => {
    if (!isElectron()) {
      setError('❌ 이 앱은 Electron 환경에서만 실행됩니다.');
      return;
    }
  }, []);

  const handleStatsFileSelect = async () => {
    try {
      setError('');
      setIsProcessing(true);
      const filePath = await window.electronAPI.selectFile();
      if (filePath) {
        setStatsFilePath(filePath);
        setStatsFileName(getFileName(filePath));
        setProcessedData(null);
        
        // 바로 로드
        const data = await loadStatsFile(filePath, platform);
        setStatsData(data);
        console.log(`📊 통계자료 (${data.length}행) 플랫폼: ${platform} 작품 수: ${data.length}개`);
      }
    } catch (err) {
      setError('❌ 파일 선택 중 오류가 발생했습니다: ' + err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResultFileSelect = async () => {
    try {
      setError('');
      setIsProcessing(true);
      const filePath = await window.electronAPI.selectFile();
      if (filePath) {
        setResultFilePath(filePath);
        setResultFileName(getFileName(filePath));
        setProcessedData(null);
        
        // 바로 로드
        const data = await loadResultFile(filePath, platform);
        setResultData(data);
        console.log(`📋 결과파일 로드 완료 (${data.length}행)`);
      }
    } catch (err) {
      setError('❌ 파일 선택 중 오류가 발생했습니다: ' + err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag & Drop 이벤트 핸들러들
  const handleDragOver = (e: React.DragEvent, type: 'stats' | 'result') => {
    e.preventDefault();
    if (type === 'stats') {
      setDragOverStats(true);
    } else {
      setDragOverResult(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent, type: 'stats' | 'result') => {
    e.preventDefault();
    if (type === 'stats') {
      setDragOverStats(false);
    } else {
      setDragOverResult(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, type: 'stats' | 'result') => {
    e.preventDefault();
    
    if (type === 'stats') {
      setDragOverStats(false);
    } else {
      setDragOverResult(false);
    }

    // 여러 방법으로 파일 경로 가져오기 시도
    let filePath: string | null = null;

    // 방법 1: files 배열에서 path 속성 확인
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      filePath = (file as any).path;
    }

    // 방법 2: items에서 파일 경로 가져오기
    if (!filePath && e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0];
      
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry && entry.isFile) {
          const fileEntry = entry as any;
          
          // FileEntry에서 실제 파일 경로 가져오기 시도
          try {
            // Electron에서 FileEntry를 실제 경로로 변환하는 방법
            const file = await new Promise<File>((resolve, reject) => {
              fileEntry.file(resolve, reject);
            });
            
            // 파일을 임시로 저장하고 경로 가져오기
            const arrayBuffer = await file.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            
            // 임시 파일로 저장하고 경로 반환
            const tempPath = await window.electronAPI.saveTempFile(buffer, file.name);
            if (tempPath) {
              filePath = tempPath;
            }
          } catch (err) {
            console.log('Error getting file from entry:', err);
          }
        }
      }
    }

    // 방법 3: text/plain 데이터에서 경로 추출
    if (!filePath) {
      const textData = e.dataTransfer.getData('text/plain');
      if (textData && (textData.includes('\\') || textData.includes('/'))) {
        filePath = textData.split('\n')[0].trim();
      }
    }

    // 방법 4: text/uri-list에서 경로 추출
    if (!filePath) {
      const uriData = e.dataTransfer.getData('text/uri-list');
      if (uriData) {
        const uri = uriData.split('\n')[0].trim();
        if (uri.startsWith('file://')) {
          filePath = decodeURIComponent(uri.replace('file://', ''));
        }
      }
    }

    // 방법 5: 모든 가능한 데이터 타입 확인
    if (!filePath) {
      for (const type of e.dataTransfer.types) {
        const data = e.dataTransfer.getData(type);
        if (data && (data.includes('\\') || data.includes('/'))) {
          filePath = data.split('\n')[0].trim();
          break;
        }
      }
    }

    if (!filePath) {
      setError('❌ 파일 경로를 가져올 수 없습니다. 파일 선택 버튼을 사용해주세요.');
      return;
    }

    try {
      setError('');
      setIsProcessing(true);

      // Electron API를 통해 파일 검증
      await window.electronAPI.handleFileDrop(filePath, type);

      if (type === 'stats') {
        setStatsFilePath(filePath);
        setStatsFileName(getFileName(filePath));
        setProcessedData(null);
        const data = await loadStatsFile(filePath, platform);
        setStatsData(data);
        console.log(`📊 통계자료 (${data.length}행) 플랫폼: ${platform} 작품 수: ${data.length}개`);
      } else {
        setResultFilePath(filePath);
        setResultFileName(getFileName(filePath));
        setProcessedData(null);
        const data = await loadResultFile(filePath, platform);
        setResultData(data);
        console.log(`📋 결과파일 로드 완료 (${data.length}행)`);
      }
    } catch (err) {
      setError(`❌ ${type === 'stats' ? '통계자료' : '결과'} 파일 로드 중 오류가 발생했습니다: ` + err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileAreaClick = (type: 'stats' | 'result') => {
    if (type === 'stats') {
      handleStatsFileSelect();
    } else {
      handleResultFileSelect();
    }
  };

  const processDataHandler = () => {
    if (!statsData.length || !resultData.length) return;
    
    try {
      setError('');
      const processed = processData(statsData, resultData, platform);
      setProcessedData(processed);
      console.log('✅ 데이터 처리 완료');
    } catch (err) {
      setError('❌ 데이터 처리 중 오류가 발생했습니다: ' + err);
    }
  };

  const saveResultsHandler = async () => {
    if (!processedData || !resultData.length) return;
    
    try {
      setError('');
      setIsProcessing(true);
      const savedPath = await saveResults(processedData, resultData, platform);
      
      if (savedPath) {
        await window.electronAPI.openFile(savedPath);
        console.log('✅ 결과 파일 저장 및 열기 완료');
      }
    } catch (err) {
      setError('❌ 결과 저장 중 오류가 발생했습니다: ' + err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="app">
        <div className="error-container">
          <h1>❌ 오류 발생</h1>
          <p>{error}</p>
          <button onClick={() => setError('')}>다시 시도</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📊 KOCM Stats</h1>
        <p>소설/웹툰 매출 통계 분석 도구</p>
      </header>

      <main className="app-main">
                 <section className="platform-section">
           <h2>1. 플랫폼 선택</h2>
           <div className="platform-selector">
             <div className="platform-row">
               <label>
                 <input
                   type="radio"
                   name="platform"
                   value="naver"
                   checked={platform === 'naver'}
                   onChange={(e) => setPlatform(e.target.value as 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly')}
                 />
                 <span>📚 네이버</span>
               </label>
               <label>
                 <input
                   type="radio"
                   name="platform"
                   value="kakao"
                   checked={platform === 'kakao'}
                   onChange={(e) => setPlatform(e.target.value as 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly')}
                 />
                 <span>📖 카카오</span>
               </label>
               <label>
                 <input
                   type="radio"
                   name="platform"
                   value="ridibooks"
                   checked={platform === 'ridibooks'}
                   onChange={(e) => setPlatform(e.target.value as 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly')}
                 />
                 <span>📘 리디북스</span>
               </label>
             </div>
             <div className="platform-row">
               <label>
                 <input
                   type="radio"
                   name="platform"
                   value="naver-monthly"
                   checked={platform === 'naver-monthly'}
                   onChange={(e) => setPlatform(e.target.value as 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly')}
                 />
                 <span>📅 네이버 월정산</span>
               </label>
               <label>
                 <input
                   type="radio"
                   name="platform"
                   value="kakao-monthly"
                   checked={platform === 'kakao-monthly'}
                   onChange={(e) => setPlatform(e.target.value as 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly')}
                 />
                 <span>📆 카카오 월정산</span>
               </label>
               <label>
                 <input
                   type="radio"
                   name="platform"
                   value="ridibooks-monthly"
                   checked={platform === 'ridibooks-monthly'}
                   onChange={(e) => setPlatform(e.target.value as 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly')}
                 />
                 <span>📅 리디북스 월정산</span>
               </label>
               <label>
                 <input
                   type="radio"
                   name="platform"
                   value="onestore-monthly"
                   checked={platform === 'onestore-monthly'}
                   onChange={(e) => setPlatform(e.target.value as 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly')}
                 />
                 <span>🏪 원스토어 월정산</span>
               </label>
             </div>
           </div>
         </section>

                <section className="file-section">
          <h2>2. 파일 선택</h2>
          <div className="file-grid">
            <div 
              className={`file-input ${dragOverStats ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, 'stats')}
              onDragLeave={(e) => handleDragLeave(e, 'stats')}
              onDrop={(e) => handleDrop(e, 'stats')}
            >
              <h3>📊 통계자료 파일</h3>
              <div className="drop-zone">
                <button 
                  onClick={handleStatsFileSelect} 
                  className="file-button"
                  disabled={isProcessing}
                >
                  {isProcessing ? '⏳ 로딩 중...' : '📁 통계자료 파일 선택'}
                </button>
                <p className="drag-hint">또는 파일을 여기에 드래그하세요</p>
              </div>
              {statsFileName && (
                <p className="file-path">선택된 파일: {statsFileName}</p>
              )}
            </div>
            
            <div 
              className={`file-input ${dragOverResult ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, 'result')}
              onDragLeave={(e) => handleDragLeave(e, 'result')}
              onDrop={(e) => handleDrop(e, 'result')}
            >
              <h3>📋 결과 파일</h3>
              <div className="drop-zone">
                <button 
                  onClick={handleResultFileSelect} 
                  className="file-button"
                  disabled={isProcessing}
                >
                  {isProcessing ? '⏳ 로딩 중...' : '📁 결과 파일 선택'}
                </button>
                <p className="drag-hint">또는 파일을 여기에 드래그하세요</p>
              </div>
              {resultFileName && (
                <p className="file-path">선택된 파일: {resultFileName}</p>
              )}
            </div>
          </div>
        </section>

        {(statsData.length > 0 || resultData.length > 0) && (
          <section className="preview-section">
            <h2>3. 데이터 미리보기</h2>
            <div className="preview-grid">
              {statsData.length > 0 && (
                <div className="preview-card">
                  <h3>📊 통계자료 ({statsData.length}행)</h3>
                  <div className="preview-content">
                    <p><strong>플랫폼:</strong> {platform}</p>
                    <p><strong>작품 수:</strong> {statsData.filter((row: any) => row.title).length}개</p>
                  </div>
                </div>
              )}
              
              {resultData.length > 0 && (
                <div className="preview-card">
                  <h3>📋 결과파일</h3>
                  <div className="preview-content">
                    {platform === 'ridibooks' ? (
                      <>
                        <p><strong>기존 소설 수:</strong> {
                          resultData[1] && Array.isArray(resultData[1]) ?
                            resultData[1].filter((title: any) =>
                              title && typeof title === 'string' && title.trim() &&
                              title !== '리디북스' && title !== '기타' && title !== '합계'
                            ).length : 0
                        }개</p>
                        <p><strong>기존 웹툰 수:</strong> {
                          resultData[9] && Array.isArray(resultData[9]) ?
                            resultData[9].filter((title: any) =>
                              title && typeof title === 'string' && title.trim() &&
                              title !== '웹툰' && title !== '기타' && title !== '합계'
                            ).length : 0
                        }개</p>
                      </>
                    ) : platform === 'ridibooks-monthly' ? (
                      <>
                        <p><strong>기존 소설 수:</strong> {
                          resultData.slice(2).filter((row: any) =>
                            row && Array.isArray(row) && row[0] &&
                            typeof row[0] === 'string' && row[0].trim() &&
                            row[0] !== '리디북스 소설' && row[0] !== '기타' && row[0] !== '합계' &&
                            row[0] !== '제목' && row[0].length > 1
                          ).length
                        }개</p>
                        <p><strong>기존 웹툰 수:</strong> {
                          resultData.slice(2).filter((row: any) =>
                            row && Array.isArray(row) && row[5] &&
                            typeof row[5] === 'string' && row[5].trim() &&
                            row[5] !== '리디북스 소설' && row[5] !== '기타' && row[5] !== '합계' &&
                            row[5] !== '제목' && row[5].length > 1
                          ).length
                        }개</p>
                      </>
                    ) : platform === 'kakao-monthly' ? (
                      <p><strong>기존 제목 수:</strong> {
                        resultData.slice(2).filter((row: any) =>
                          row && Array.isArray(row) && row[0] &&
                          typeof row[0] === 'string' && row[0].trim() &&
                          row[0] !== '제목' && row[0] !== '기타' && row[0] !== '합계' &&
                          row[0].length > 1
                        ).length
                      }개</p>
                    ) : platform === 'naver-monthly' ? (
                      <p><strong>기존 제목 수:</strong> {
                        resultData.slice(2).filter((row: any) =>
                          row && Array.isArray(row) && row[0] &&
                          typeof row[0] === 'string' && row[0].trim() &&
                          row[0] !== '제목' && row[0] !== '기타' && row[0] !== '합계' &&
                          row[0].length > 1
                        ).length
                      }개</p>
                    ) : platform === 'onestore-monthly' ? (
                      <p><strong>기존 제목 수:</strong> {
                        resultData.slice(2).filter((row: any) =>
                          row && Array.isArray(row) && row[0] &&
                          typeof row[0] === 'string' && row[0].trim() &&
                          row[0] !== '제목' && row[0] !== '기타' && row[0] !== '합계' &&
                          row[0].length > 1
                        ).length
                      }개</p>
                    ) : (
                      <p><strong>기존 제목 수:</strong> {
                        resultData[1] && Array.isArray(resultData[1]) ?
                          resultData[1].filter((title: any) =>
                            title && typeof title === 'string' && title.trim() &&
                            !title.includes('EMPTY') && title !== '네이버 통계폼' &&
                            title !== '기타' && title !== '합계'
                          ).length : 0
                      }개</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {statsData.length > 0 && resultData.length > 0 && (
              <button onClick={processDataHandler} className="process-button" disabled={isProcessing}>
                {isProcessing ? '⏳ 처리 중...' : '🔄 데이터 처리하기'}
              </button>
            )}
          </section>
        )}

        {processedData && (
          <section className="results-section">
            <h2>4. 처리 결과 ({processedData.platform})</h2>
            
            <div className="results-grid">
              {/* 첫 번째 행: 소설 */}
              <div className="result-card">
                <h3>📚 주요 소설 매출</h3>
                <p>{Object.keys(processedData.majorTitles).length}개 작품</p>
                <div className="result-list">
                  {Object.entries(processedData.majorTitles)
                    .sort(sortByRevenue)
                    .map(([title, revenue]) => (
                      <div key={title} className="result-item">
                        <span className="title">{processedData.titleMappings[title] || title}</span>
                        <span className="revenue">{formatRevenueWithSign(revenue)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="result-card">
                <h3>📦 기타 소설 매출</h3>
                <p>{Object.keys(processedData.etcTitles).length}개 작품</p>
                <div className="result-list">
                  {Object.entries(processedData.etcTitles)
                    .sort(sortByRevenue)
                    .map(([title, revenue]) => (
                      <div key={title} className="result-item">
                        <span className="title">{processedData.titleMappings[title] || title}</span>
                        <span className="revenue">{formatRevenueWithSign(revenue)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* 두 번째 행: 웹툰 (리디북스만) */}
              {(processedData.platform === 'ridibooks' || processedData.platform === 'ridibooks-monthly') && (
                <>
                  <div className="result-card">
                    <h3>🎨 주요 웹툰 매출</h3>
                    <p>{processedData.majorWebtoonTitles ? Object.keys(processedData.majorWebtoonTitles).length : 0}개 작품</p>
                    <div className="result-list">
                      {processedData.majorWebtoonTitles && Object.entries(processedData.majorWebtoonTitles)
                        .sort(sortByRevenue)
                        .map(([title, revenue]) => (
                          <div key={title} className="result-item">
                            <span className="title">{processedData.webtoonTitleMappings?.[title] || title}</span>
                            <span className="revenue">{formatRevenueWithSign(revenue)}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="result-card">
                    <h3>📦 기타 웹툰 매출</h3>
                    <p>{processedData.etcWebtoonTitles ? Object.keys(processedData.etcWebtoonTitles).length : 0}개 작품</p>
                    <div className="result-list">
                      {processedData.etcWebtoonTitles && Object.entries(processedData.etcWebtoonTitles)
                        .sort(sortByRevenue)
                        .map(([title, revenue]) => (
                          <div key={title} className="result-item">
                            <span className="title">{processedData.webtoonTitleMappings?.[title] || title}</span>
                            <span className="revenue">{formatRevenueWithSign(revenue)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="save-section">
              <button onClick={saveResultsHandler} disabled={isProcessing}>
                {isProcessing ? '저장 중...' : '결과 파일 생성하기'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;