# 开发指南

本文档面向开发者，包含技术实现说明、开发环境配置、测试方法等内容。

## 🏗️ 技术架构

### 项目结构

这是一个 **TypeScript npm 库**，提供抖音视频文本提取功能：

```
douyin-text-extractor/
├── 📁 src/                    # 源代码
│   ├── config/               # 配置管理
│   ├── services/             # 核心业务逻辑
│   │   └── DouyinService.ts  # 主要服务类
│   ├── types/               # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   │   ├── fileUtils.ts    # 文件操作工具
│   │   └── logger.ts       # 日志工具
│   └── index.ts            # 库的导出入口
├── 📁 scripts/             # 命令行工具
├── 📁 docs/               # 文档
├── example.ts             # 使用示例
└── dist/                  # 编译后的代码 (发布到 npm)
```

### 核心组件

- **DouyinService**: 主要服务类，提供所有核心功能
- **类型定义**: 完整的 TypeScript 接口定义
- **工具函数**: 文件操作、日志记录等辅助功能
- **命令行工具**: 独立的 CLI 脚本

### 关键类型定义

```typescript
// src/types/index.ts
export interface DouyinVideoInfo {
  videoId: string;
  title: string;
  downloadUrl: string;
  desc?: string;
}

export interface ProcessingProgress {
  stage: "parsing" | "downloading" | "extracting_audio" | "speech_recognition" | "cleaning" | "completed";
  progress: number;
  message: string;
}

export interface ExtractTextResponse {
  status: "success" | "error";
  videoInfo?: DouyinVideoInfo;
  extractedText?: string;
  error?: string;
  processingTime?: number;
}
```

## 🔧 开发环境

### 环境配置

```bash
# 1. 克隆项目
git clone <repo-url>
cd douyin-text-extractor

# 2. 安装依赖
npm install

# 3. 配置环境变量 (可选)
cp env.example .env
# 编辑 .env 文件设置 API 密钥

# 4. 编译 TypeScript
npm run build

# 5. 运行示例 (需要 Node.js 环境)
node -r ts-node/register example.ts
```

### 开发脚本

```bash
# TypeScript 编译
npm run build

# ESLint 代码检查
npm run lint

# 自动修复代码风格
npm run lint:fix

# 清理构建产物
npm run clean

# 发布前构建
npm run prepublishOnly
```

## 📋 核心实现

### 1. DouyinService 类

主要的服务类，提供所有核心功能：

```typescript
export class DouyinService {
  constructor(
    speechApiKey: string,
    speechApiBaseUrl: string,
    speechModel: string,
    autoCleanTempFiles: boolean = true
  );

  // 核心方法
  async parseShareUrl(shareText: string): Promise<DouyinVideoInfo>;
  async downloadVideo(videoInfo: DouyinVideoInfo, progressCallback?): Promise<string>;
  async extractAudio(videoPath: string, progressCallback?): Promise<string>;
  async extractTextFromAudio(audioPath: string, progressCallback?): Promise<string>;
  async extractText(shareLink: string, progressCallback?): Promise<ExtractTextResponse>;
}
```

### 2. 链接解析

```typescript
async parseShareUrl(shareText: string): Promise<DouyinVideoInfo> {
  // 1. 正则提取分享链接
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = shareText.match(urlRegex);
  
  // 2. 处理重定向获取视频ID
  const shareResponse = await axios.get(shareUrl, {
    headers: { 'User-Agent': this.userAgent },
    maxRedirects: 5,
  });
  
  // 3. 解析视频信息
  const videoId = this.extractVideoId(shareResponse.request.res.responseUrl);
  return this.getVideoInfo(videoId);
}
```

### 3. 视频下载

```typescript
async downloadVideo(
  videoInfo: DouyinVideoInfo,
  progressCallback?: (progress: ProcessingProgress) => void
): Promise<string> {
  const response = await axios({
    method: 'GET',
    url: videoInfo.downloadUrl,
    responseType: 'stream',
  });
  
  // 流式下载并报告进度
  let downloaded = 0;
  const total = parseInt(response.headers['content-length'] || '0');
  
  response.data.on('data', (chunk: Buffer) => {
    downloaded += chunk.length;
    const progress = Math.round((downloaded / total) * 100);
    progressCallback?.({
      stage: 'downloading',
      progress,
      message: `下载中: ${formatBytes(downloaded)}/${formatBytes(total)}`
    });
  });
}
```

### 4. 音频提取

使用 FFmpeg 从视频中提取音频：

```typescript
async extractAudio(
  videoPath: string,
  progressCallback?: (progress: ProcessingProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .audioCodec('libmp3lame')
      .audioQuality(0)
      .on('progress', (progress) => {
        const percent = Math.round(progress.percent || 0);
        progressCallback?.({
          stage: 'extracting_audio',
          progress: percent,
          message: `音频提取: ${percent}%`
        });
      })
      .on('end', () => resolve(audioPath))
      .on('error', reject)
      .save(audioPath);
  });
}
```

### 5. 语音识别

调用语音识别 API 将音频转换为文本：

```typescript
async extractTextFromAudio(
  audioPath: string,
  progressCallback?: (progress: ProcessingProgress) => void
): Promise<string> {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(audioPath));
  formData.append('model', this.speechModel);
  
  const response = await axios.post(this.speechApiBaseUrl, formData, {
    headers: {
      'Authorization': `Bearer ${this.speechApiKey}`,
      ...formData.getHeaders()
    }
  });
  
  return response.data.text;
}
```

## 🔍 日志系统

### 日志级别

- **info**: 关键业务流程和状态
- **debug**: 详细执行步骤和中间结果  
- **error**: 错误和异常信息

### 日志配置

```typescript
// src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export default logger;
```

### 典型日志示例

```json
{
  "level": "info",
  "message": "视频下载完成",
  "videoId": "7372484719365098803",
  "filePath": "/downloads/video.mp4",
  "fileSize": "25.6MB",
  "processingTime": "15750ms",
  "timestamp": "2024-01-01T12:00:18.000Z"
}
```

## 🧪 测试

### 测试工具

项目提供了多种测试工具：

```bash
# 1. 交互式测试脚本 (HTTP API 测试)
node test-script.js "https://v.douyin.com/xxx"

# 2. 命令行工具测试
node scripts/douyin.js status
node scripts/douyin-to-text.js "https://v.douyin.com/xxx"

# 3. 运行示例代码
npx ts-node example.ts
```

### 单元测试结构

```
tests/ (建议的测试结构)
├── unit/               # 单元测试
│   ├── DouyinService.test.ts
│   └── utils.test.ts
├── integration/        # 集成测试
└── fixtures/          # 测试数据
```

### 示例测试代码

```typescript
// tests/unit/DouyinService.test.ts
import { DouyinService } from '../src';

describe('DouyinService', () => {
  let service: DouyinService;
  
  beforeEach(() => {
    service = new DouyinService(
      'test-api-key',
      'https://api.example.com',
      'test-model'
    );
  });
  
  it('should parse share url correctly', async () => {
    const shareText = "https://v.douyin.com/iFhbaXJa/";
    const result = await service.parseShareUrl(shareText);
    
    expect(result).toHaveProperty('videoId');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('downloadUrl');
  });
});
```

## 🏗️ 构建与发布

### 本地构建

```bash
# TypeScript 编译
npm run build

# 检查构建产物
ls dist/
# index.js, index.d.ts, services/, types/, utils/
```

### npm 包发布

```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 构建并发布
npm publish
```

### 包结构

发布到 npm 的包结构：

```
douyin-text-extractor/
├── dist/                    # 编译后的 JavaScript 代码
│   ├── index.js            # 主入口
│   ├── index.d.ts          # TypeScript 类型定义
│   ├── services/
│   ├── types/
│   └── utils/
├── README.md               # 使用说明
└── LICENSE                 # 许可证
```

## 📊 性能优化

### 内存管理

```typescript
// 流式处理大文件
const stream = fs.createReadStream(videoPath);
stream.on('data', (chunk) => {
  // 处理数据块
});

// 及时清理临时文件
async cleanupTempFiles() {
  const files = await fs.readdir(this.tempDir);
  const oneHourAgo = Date.now() - 3600000;
  
  for (const file of files) {
    const filePath = path.join(this.tempDir, file);
    const stats = await fs.stat(filePath);
    
    if (stats.mtime.getTime() < oneHourAgo) {
      await fs.unlink(filePath);
    }
  }
}
```

### 并发控制

```typescript
// 限制并发下载数量
import pLimit from 'p-limit';

const limit = pLimit(3); // 最多3个并发

const promises = urls.map(url => 
  limit(() => this.downloadVideo(url))
);

const results = await Promise.all(promises);
```

## 🔧 扩展开发

### 添加新的语音识别服务

```typescript
// 扩展 DouyinService 以支持多种语音识别服务
interface SpeechProvider {
  transcribe(audioPath: string): Promise<string>;
}

class OpenAISpeechProvider implements SpeechProvider {
  async transcribe(audioPath: string): Promise<string> {
    // OpenAI Whisper API 实现
  }
}

class SiliconFlowProvider implements SpeechProvider {
  async transcribe(audioPath: string): Promise<string> {
    // SiliconFlow API 实现
  }
}
```

### 添加新的视频平台支持

```typescript
// 扩展以支持其他平台
abstract class VideoService {
  abstract parseShareUrl(shareText: string): Promise<VideoInfo>;
  abstract downloadVideo(videoInfo: VideoInfo): Promise<string>;
}

class TikTokService extends VideoService {
  async parseShareUrl(shareText: string): Promise<VideoInfo> {
    // TikTok 链接解析实现
  }
}
```

## 🐛 调试技巧

### 开启详细日志

```bash
export LOG_LEVEL=debug
node example.ts
```

### 使用 VS Code 调试

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Example",
      "program": "${workspaceFolder}/example.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "LOG_LEVEL": "debug",
        "SPEECH_API_KEY": "your-api-key"
      }
    }
  ]
}
```

### 网络请求调试

```typescript
// 在 DouyinService 中添加请求拦截器
import axios, { AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create();

axiosInstance.interceptors.request.use(config => {
  logger.debug('Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    headers: config.headers
  });
  return config;
});

axiosInstance.interceptors.response.use(
  response => {
    logger.debug('Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url
    });
    return response;
  },
  error => {
    logger.error('Request Error:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);
```

## 📈 库使用监控

作为 npm 库，可以通过以下方式了解使用情况：

### 基本使用统计

```typescript
// 在关键方法中添加使用统计
export class DouyinService {
  private static usageStats = {
    parseShareUrl: 0,
    downloadVideo: 0,
    extractText: 0
  };

  async parseShareUrl(shareText: string): Promise<DouyinVideoInfo> {
    DouyinService.usageStats.parseShareUrl++;
    logger.info('Method called', { method: 'parseShareUrl', count: DouyinService.usageStats.parseShareUrl });
    // ... 实现
  }
}
```

## 🔗 相关资源

- [快速开始指南](./QUICKSTART.md) - 基本使用方法
- [命令行工具文档](./CLI.md) - CLI 工具使用
- [API 文档](../README.md) - 完整 API 说明
- [更新日志](../CHANGELOG.md) - 版本更新记录
- [示例代码](../example.ts) - 完整使用示例 