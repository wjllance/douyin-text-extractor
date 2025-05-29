# 开发指南

本文档面向开发者，包含技术实现说明、开发环境配置、测试方法等内容。

## 🏗️ 技术架构

### 核心组件

```
src/
├── config/           # 配置管理
├── controllers/      # HTTP 控制器  
├── middleware/       # Express 中间件
├── services/         # 业务逻辑服务
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数
└── index.ts         # 应用入口
```

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
```

## 🔧 开发环境

### 环境配置

```bash
# 1. 克隆项目
git clone <repo-url>
cd douyin-text-extractor

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp env.example .env
# 编辑 .env 文件设置 API 密钥

# 4. 编译 TypeScript
npm run build

# 5. 开发模式运行
npm run dev
```

### 开发工具

```bash
# TypeScript 编译检查
npm run build

# ESLint 代码检查
npm run lint

# 自动修复代码风格
npm run lint:fix

# 运行测试
npm test
```

## 📋 核心实现

### 1. 链接解析

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

### 2. 视频下载

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

### 3. 音频提取

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

### 4. 语音识别

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
// src/config/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});
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

### 测试结构

```
tests/
├── unit/           # 单元测试
├── integration/    # 集成测试
└── fixtures/       # 测试数据
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "DouyinService"

# 生成覆盖率报告
npm run test:coverage
```

### 测试脚本

项目提供了完整的测试脚本：

```bash
# 交互式测试工具
node test-script.js

# Shell 测试脚本
./test.sh
```

**test-script.js** 功能：
- 🔍 解析抖音链接
- 📥 下载视频测试
- 🎵 音频提取测试
- 🗣️ 语音识别测试
- 📊 完整流程测试

### 示例测试

```javascript
// tests/unit/douyin-service.test.js
describe('DouyinService', () => {
  let service;
  
  beforeEach(() => {
    service = new DouyinService(
      process.env.SPEECH_API_KEY,
      process.env.SPEECH_API_BASE_URL,
      process.env.SPEECH_MODEL
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

## 🏗️ 构建与部署

### 本地构建

```bash
# TypeScript 编译
npm run build

# 检查构建产物
ls dist/
```

### Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine

# 安装 FFmpeg
RUN apk add --no-cache ffmpeg

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY . .

# 编译 TypeScript
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  douyin-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - SPEECH_API_KEY=${SPEECH_API_KEY}
      - NODE_ENV=production
    volumes:
      - ./downloads:/app/downloads
      - ./temp:/app/temp
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
// src/services/speech/providers/NewProvider.ts
export class NewSpeechProvider implements SpeechProvider {
  async transcribe(audioPath: string): Promise<string> {
    // 实现新服务的调用逻辑
  }
}

// 注册新服务
const speechService = new SpeechServiceFactory()
  .register('new-provider', NewSpeechProvider)
  .create(config.speechProvider);
```

### 添加新的视频平台支持

```typescript
// src/services/video/providers/NewPlatform.ts
export class NewPlatformService implements VideoService {
  async parseShareUrl(shareText: string): Promise<VideoInfo> {
    // 实现新平台的链接解析
  }
  
  async downloadVideo(videoInfo: VideoInfo): Promise<string> {
    // 实现新平台的视频下载
  }
}
```

## 🐛 调试技巧

### 开启详细日志

```bash
export LOG_LEVEL=debug
npm run dev
```

### 使用调试器

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug App",
  "program": "${workspaceFolder}/dist/index.js",
  "env": {
    "NODE_ENV": "development",
    "LOG_LEVEL": "debug"
  }
}
```

### 网络请求调试

```typescript
// 添加请求拦截器
axios.interceptors.request.use(config => {
  console.log('Request:', config.method?.toUpperCase(), config.url);
  return config;
});

axios.interceptors.response.use(
  response => {
    console.log('Response:', response.status, response.statusText);
    return response;
  },
  error => {
    console.error('Error:', error.message);
    return Promise.reject(error);
  }
);
```

## 📈 监控与维护

### 健康检查

```typescript
// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime()
  });
});
```

### 性能监控

```typescript
// 请求处理时间中间件
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
});
```

## 🔗 相关资源

- [快速开始指南](./QUICKSTART.md)
- [命令行工具文档](./CLI.md)
- [API 文档](../README.md)
- [更新日志](../CHANGELOG.md) 