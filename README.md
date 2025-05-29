# Douyin Text Extractor

一个用于解析抖音视频链接并提取视频中音频文本的 Node.js TypeScript 库。

## ✨ 功能特性

- 📱 解析抖音分享链接，获取无水印视频
- 🎵 提取音频并转换为文本
- 🔄 支持进度回调和错误处理
- 🧹 自动清理临时文件
- 📦 完整的 TypeScript 类型支持

## 🚀 快速开始

### 安装

```bash
npm install douyin-text-extractor
```

### 基本使用

```javascript
const { DouyinService } = require("douyin-text-extractor");

const service = new DouyinService(
  "your-speech-api-key",
  "https://api.siliconflow.cn/v1/audio/transcriptions",
  "FunAudioLLM/SenseVoiceSmall"
);

async function extractText() {
  const shareLink = "复制的抖音分享链接";
  
  try {
    const result = await service.extractText(shareLink, (progress) => {
      console.log(`${progress.stage}: ${progress.progress}%`);
    });
    
    console.log("提取的文本:", result.extractedText);
  } catch (error) {
    console.error("提取失败:", error.message);
  }
}

extractText();
```

### TypeScript 支持

```typescript
import { DouyinService, ProcessingProgress } from "douyin-text-extractor";

const service = new DouyinService(apiKey, baseUrl, model);

const result = await service.extractText(shareLink, 
  (progress: ProcessingProgress) => {
    console.log(`${progress.stage}: ${progress.progress}%`);
  }
);
```

## 📖 API 文档

### DouyinService

```javascript
new DouyinService(speechApiKey, speechApiBaseUrl, speechModel, autoCleanTempFiles)
```

**主要方法：**

- `parseShareUrl(shareText)` - 解析分享链接
- `downloadVideo(videoInfo, progressCallback)` - 下载视频
- `extractAudio(videoPath, progressCallback)` - 提取音频
- `extractTextFromAudio(audioPath, progressCallback)` - 音频转文本
- `extractText(shareLink, progressCallback)` - 一键提取文本

## ⚙️ 配置

### 环境变量

```bash
SPEECH_API_KEY="your-api-key"
SPEECH_API_BASE_URL="https://api.siliconflow.cn/v1/audio/transcriptions"
SPEECH_MODEL="FunAudioLLM/SenseVoiceSmall"
TEMP_DIR="./temp"
DOWNLOAD_DIR="./downloads"
```

### 依赖要求

- Node.js >= 16.0.0
- FFmpeg (音频处理)

**安装 FFmpeg:**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg
```

## 🛠️ 命令行工具

项目包含完整的命令行工具，支持单个和批量处理：

```bash
# 下载视频
node scripts/douyin.js download "https://v.douyin.com/xxx"

# 提取文本
node scripts/douyin.js to-text "https://v.douyin.com/xxx"

# 批量处理
node scripts/douyin.js batch links.txt
```

详细说明请参考 [命令行工具文档](./docs/CLI.md)

## 🐳 Docker 部署

```bash
# 设置环境变量
echo "SPEECH_API_KEY=your-api-key" > .env

# 启动服务
docker-compose up -d
```

## 📚 文档

- [快速开始](./docs/QUICKSTART.md) - 详细的安装和使用指南
- [命令行工具](./docs/CLI.md) - 命令行工具完整说明
- [开发指南](./docs/DEVELOPMENT.md) - 开发和技术实现说明
- [更新日志](./CHANGELOG.md) - 版本更新记录

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](./LICENSE)
