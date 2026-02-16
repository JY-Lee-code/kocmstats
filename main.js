const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 개발 환경인지 확인
const isDev = !app.isPackaged;

function createWindow() {
  // 메인 윈도우 생성
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: false
    },
    titleBarStyle: 'default',
    show: false
  });

  // Drag & Drop 활성화
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  // Drag & Drop 활성화를 위한 설정
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
      // 전역 drag & drop 이벤트 방지
      document.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      
      document.addEventListener('drop', (e) => {
        e.preventDefault();
      });
    `);
  });

  // 개발 환경이면 Vite 서버에서, 프로덕션이면 빌드된 파일에서 로드
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // preload 스크립트 로드 확인
  console.log('Preload script path:', path.join(__dirname, 'preload.js'));
  console.log('Preload script exists:', require('fs').existsSync(path.join(__dirname, 'preload.js')));

  // 윈도우가 준비되면 보여주기
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 웹 콘텐츠가 로드되었을 때 확인
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('Web contents finished loading');
  });
}

// 앱이 준비되면 윈도우 생성
app.whenReady().then(createWindow);

// 모든 윈도우가 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 파일 선택 다이얼로그
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'All Supported Files', extensions: ['xlsx', 'xls', 'csv'] },
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 파일 저장 다이얼로그
ipcMain.handle('save-file', async (event, data, filename) => {
  const result = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: [
      { name: 'Excel Files', extensions: ['xlsx'] }
    ]
  });
  
  if (!result.canceled && result.filePath) {
    try {
      // 파일을 실제로 저장
      fs.writeFileSync(result.filePath, Buffer.from(data));
      
      // 저장 완료 알림 창 표시
      dialog.showMessageBox({
        type: 'info',
        title: '저장 완료',
        message: '파일이 성공적으로 저장되었습니다!',
        detail: `저장 위치: ${result.filePath}`,
        buttons: ['확인']
      });
      
      return result.filePath;
    } catch (error) {
      throw new Error(`파일 저장 중 오류가 발생했습니다: ${error.message}`);
    }
  }
  return null;
});

// 파일 읽기
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return data;
  } catch (error) {
    throw new Error(`파일을 읽을 수 없습니다: ${error.message}`);
  }
});

// 파일 쓰기
ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data);
    return true;
  } catch (error) {
    throw new Error(`파일을 저장할 수 없습니다: ${error.message}`);
  }
});

// 파일 열기
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return true;
  } catch (error) {
    console.error('Failed to open file:', error);
    throw error;
  }
});

// Drag & Drop 파일 처리
ipcMain.handle('handle-file-drop', async (event, filePath, type) => {
  try {
    // 파일이 존재하는지 확인
    if (!fs.existsSync(filePath)) {
      throw new Error('파일이 존재하지 않습니다.');
    }
    
    // 파일 확장자 확인
    const ext = path.extname(filePath).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      throw new Error('지원하지 않는 파일 형식입니다.');
    }
    
    return { success: true, filePath };
  } catch (error) {
    throw new Error(`파일 처리 중 오류가 발생했습니다: ${error.message}`);
  }
});

// 임시 파일 저장
ipcMain.handle('save-temp-file', async (event, data, filename) => {
  try {
    const tempDir = path.join(app.getPath('temp'), 'kocmstats');
    
    // 임시 디렉토리가 없으면 생성
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempPath = path.join(tempDir, filename);
    // Uint8Array를 Buffer로 변환하여 저장
    const buffer = Buffer.from(data);
    fs.writeFileSync(tempPath, buffer);
    
    return tempPath;
  } catch (error) {
    console.error('Failed to save temp file:', error);
    throw error;
  }
});