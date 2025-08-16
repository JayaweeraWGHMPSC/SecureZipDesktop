const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const archiver = require('archiver');
const extract = require('extract-zip');

// Global variable to store file data in memory
let fileDataCache = new Map();

// Enable hot reload for development only
if (!app || !app.isPackaged) {
  try {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
  } catch (e) {
    // Ignore if not installed
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'icon.ico'),
    show: false,
    frame: true,
    resizable: true,
    minWidth: 800,
    minHeight: 600
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Remove menu bar for cleaner look
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

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

// IPC handlers for encryption/decryption operations

// Text encryption using Fernet only
ipcMain.handle('encrypt-text', async (event, text, algorithm = 'fernet') => {
  try {
    // Fernet-like encryption using AES-256-CBC
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key.toString('base64'));
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const keyString = key.toString('base64') + ':' + iv.toString('base64');
    
    return {
      success: true,
      encryptedText: encrypted,
      key: keyString,
      algorithm: 'FERNET'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Text decryption for Fernet only
ipcMain.handle('decrypt-text', async (event, encryptedText, key, algorithm = 'fernet') => {
  try {
    // Fernet-like decryption
    const keyParts = key.split(':');
    const keyBuffer = keyParts[0];
    const decipher = crypto.createDecipher('aes-256-cbc', keyBuffer);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return {
      success: true,
      decryptedText: decrypted
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Compress folder to ZIP file (temporary)

// File selection dialog
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'] },
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] },
      { name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'aac'] },
      { name: 'Video', extensions: ['mp4', 'avi', 'mkv', 'mov'] }
    ]
  });
  
  return result.filePaths[0] || null;
});

// Folder selection dialog
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  return result.filePaths[0] || null;
});

// Compress folder to ZIP file (temporary)
ipcMain.handle('compress-folder', async (event, folderPath) => {
  try {
    const os = require('os');
    const tempDir = os.tmpdir();
    const folderName = path.basename(folderPath);
    const tempZipPath = path.join(tempDir, `SecureZip_temp_${Date.now()}_${folderName}.zip`);
    
    const output = fs.createWriteStream(tempZipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level
    });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        resolve({
          success: true,
          zipPath: tempZipPath,
          size: archive.pointer(),
          isTemporary: true // Flag to indicate this should be cleaned up
        });
      });

      archive.on('error', (err) => {
        reject({
          success: false,
          error: err.message
        });
      });

      archive.pipe(output);
      archive.directory(folderPath, false);
      archive.finalize();
    });
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// File encryption with Fernet only
ipcMain.handle('encrypt-file', async (event, filePath, algorithm = 'fernet') => {
  try {
    const data = fs.readFileSync(filePath);
    
    // Fernet-like file encryption
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const keyString = key.toString('base64') + ':' + iv.toString('base64');
    
    const encryptedPath = filePath + '.encrypted';
    // Don't save to disk yet, store in memory cache
    // fs.writeFileSync(encryptedPath, encrypted);
    
    // Generate unique cache key
    const cacheKey = `encrypted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store encrypted data in memory cache
    fileDataCache.set(cacheKey, {
      data: encrypted,
      fileName: path.basename(encryptedPath),
      originalFileName: path.basename(filePath),
      algorithm: 'FERNET',
      type: 'encrypted',
      tempFilePath: filePath // Store temp file path for cleanup
    });
    
    return {
      success: true,
      cacheKey: cacheKey, // Return cache key instead of file path
      originalFileName: path.basename(filePath),
      encryptedFileName: path.basename(encryptedPath),
      fileSize: encrypted.length,
      key: keyString,
      algorithm: 'FERNET',
      tempFilePath: filePath // Return for potential cleanup
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// File decryption for Fernet only
ipcMain.handle('decrypt-file', async (event, encryptedFilePath, key, algorithm = 'fernet') => {
  try {
    const encryptedData = fs.readFileSync(encryptedFilePath);
    
    // Fernet-like file decryption
    const keyParts = key.split(':');
    const keyBuffer = Buffer.from(keyParts[0], 'base64');
    const decipher = crypto.createDecipher('aes-256-cbc', keyBuffer);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    // Create decrypted file path
    const originalPath = encryptedFilePath.replace('.encrypted', '');
    // Don't add .decrypted suffix, use original filename
    // const decryptedPath = originalPath + '.decrypted';
    // Don't save to disk yet, store in memory cache
    // fs.writeFileSync(decryptedPath, decryptedData);
    
    // Generate unique cache key
    const cacheKey = `decrypted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store decrypted data in memory cache with original filename
    fileDataCache.set(cacheKey, {
      data: decrypted,
      fileName: path.basename(originalPath), // Use original filename without .decrypted
      originalFileName: path.basename(originalPath),
      algorithm: 'FERNET',
      type: 'decrypted'
    });
    
    return {
      success: true,
      cacheKey: cacheKey, // Return cache key instead of file path
      originalFileName: path.basename(originalPath),
      fileSize: decrypted.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Save file dialog
ipcMain.handle('save-file', async (event, defaultName) => {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.filePath) {
      return {
        success: true,
        filePath: result.filePath
      };
    } else {
      return {
        success: false,
        error: 'No location selected'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Download file from memory cache handler
ipcMain.handle('download-file', async (event, cacheKey) => {
  try {
    // Check if data exists in cache
    if (!fileDataCache.has(cacheKey)) {
      return {
        success: false,
        error: 'File data not found in cache'
      };
    }
    
    const fileInfo = fileDataCache.get(cacheKey);
    
    // Show save dialog
    const result = await dialog.showSaveDialog({
      title: 'Save File',
      defaultPath: fileInfo.fileName,
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled) {
      // Save file to user-selected location
      fs.writeFileSync(result.filePath, fileInfo.data);
      
      // Optional: Remove from cache after successful download
      fileDataCache.delete(cacheKey);
      
      return {
        success: true,
        savedPath: result.filePath
      };
    } else {
      return {
        success: false,
        error: 'Download canceled'
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Clear cache handler (optional, for cleanup)
ipcMain.handle('clear-cache', () => {
  // Clean up temporary ZIP files before clearing cache
  fileDataCache.forEach((fileInfo, key) => {
    if (fileInfo.tempFilePath && fileInfo.tempFilePath.includes('SecureZip_temp_')) {
      try {
        if (fs.existsSync(fileInfo.tempFilePath)) {
          fs.unlinkSync(fileInfo.tempFilePath);
        }
      } catch (error) {
        console.log('Error cleaning up temp file:', error.message);
      }
    }
  });
  
  fileDataCache.clear();
  return { success: true };
});

// Clean up temporary file after successful download
ipcMain.handle('cleanup-temp-file', (event, filePath) => {
  try {
    if (filePath && filePath.includes('SecureZip_temp_') && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
  } catch (error) {
    console.log('Error cleaning up temp file:', error.message);
  }
  return { success: true };
});

// Open file location in file explorer
ipcMain.handle('show-in-folder', async (event, filePath) => {
  try {
    const { shell } = require('electron');
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});