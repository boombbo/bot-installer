const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 定义存储仓库数据的文件路径
const dataPath = path.join(app.getPath('userData'), 'data');
const reposFilePath = path.join(dataPath, 'repos.json');

// 确保 data 文件夹存在
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
}

// 读取仓库数据
function readReposData() {
    try {
        if (fs.existsSync(reposFilePath)) {
            const data = JSON.parse(fs.readFileSync(reposFilePath, 'utf8'));
            console.log("读取的仓库数据:", data); // 添加调试信息
            return data;
        }
        return [];
    } catch (error) {
        console.error('读取仓库数据出错:', error);
        return [];
    }
}


// 保存仓库数据
function saveReposData(repos) {
    try {
        fs.writeFileSync(reposFilePath, JSON.stringify(repos), 'utf8');
    } catch (error) {
        console.error('保存仓库数据出错:', error);
    }
}

// 创建窗口的函数
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    // 窗口加载完成后发送仓库数据到渲染器进程
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('load-repos', readReposData());
    });
}

// 处理选择目录的 IPC 事件
ipcMain.handle('select-dirs', async (event) => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return filePaths[0];
});

// 处理克隆仓库的 IPC 事件
ipcMain.on('clone-repos', (event, { repos, directory }) => {
    repos.forEach(repo => {
        const repoName = repo.split('/').pop().split('.')[0];
        const command = `git clone ${repo} "${directory}/${repoName}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`克隆错误: ${error}`);
                return;
            }
            console.log(`克隆成功: ${stdout}`);
        });
    });
    saveReposData(repos);
});

// Electron 应用准备好后创建窗口
app.whenReady().then(createWindow);

// 所有窗口关闭时退出应用（除非在 macOS 上）
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 应用激活时创建窗口（仅 macOS）
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
