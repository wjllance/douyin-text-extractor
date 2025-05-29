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

// 最简单的方式（使用默认配置）
const service = DouyinService.create("your-speech-api-key");

// 或者使用构造函数（推荐）
const service = new DouyinService({
  speechApiKey: "your-speech-api-key"
});

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
import { DouyinService, DouyinServiceOptions } from "douyin-text-extractor";

// 基本用法
const service = new DouyinService({
  speechApiKey: "your-api-key"
});

// 完整配置
const options: DouyinServiceOptions = {
  speechApiKey: "your-api-key",
  speechApiBaseUrl: "https://api.custom.com/v1/audio/transcriptions",
  speechModel: "whisper-1",
  autoCleanTempFiles: false
};
const service = new DouyinService(options);

// 使用工厂方法
const service1 = DouyinService.create("your-api-key");
const service2 = DouyinService.createWithSiliconFlow("your-api-key");
const service3 = DouyinService.createWithOpenAI("your-openai-key");
const service4 = DouyinService.createWithEnvDefaults("your-api-key");
```

## 📖 API 文档

### DouyinService

```javascript
// 构造函数
new DouyinService(options)

// 工厂方法
DouyinService.create(speechApiKey)
DouyinService.createWithSiliconFlow(speechApiKey, speechModel?)
DouyinService.createWithOpenAI(speechApiKey, speechModel?)
DouyinService.createWithEnvDefaults(speechApiKey, overrides?)
```

**构造选项 (DouyinServiceOptions)：**

- `speechApiKey` (string, 必需) - 语音识别 API 密钥
- `speechApiBaseUrl` (string, 可选) - API 基础URL，默认: SiliconFlow API
- `speechModel` (string, 可选) - 语音识别模型，默认: FunAudioLLM/SenseVoiceSmall
- `autoCleanTempFiles` (boolean, 可选) - 是否自动清理临时文件，默认: true
- `downloadDir` (string, 可选) - 下载目录，默认: ./downloads
- `tempDir` (string, 可选) - 临时文件目录，默认: ./temp

**主要方法：**

- `parseShareUrl(shareText)` - 解析分享链接
- `downloadVideo(videoInfo, progressCallback)` - 下载视频
- `extractAudio(videoPath, progressCallback)` - 提取音频
- `extractTextFromAudio(audioPath, progressCallback)` - 音频转文本
- `extractText(shareLink, progressCallback)` - 一键提取文本

## ⚙️ 配置

### 环境变量

```bash
# 语音识别 API 配置（必需）
SPEECH_API_KEY="your-api-key"
SPEECH_API_BASE_URL="https://api.siliconflow.cn/v1/audio/transcriptions"
SPEECH_MODEL="FunAudioLLM/SenseVoiceSmall"

# 文件路径配置（可选）
TEMP_DIR="./temp"
DOWNLOAD_DIR="./downloads"

# 临时文件管理（可选）
AUTO_CLEAN_TEMP_FILES="true"

# 日志配置（可选）
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"
```

### 工厂方法推荐

推荐使用 `createWithEnvDefaults` 工厂方法，它会自动从环境变量读取配置：

```typescript
// 推荐：从环境变量自动配置
const service = DouyinService.createWithEnvDefaults(
  process.env.SPEECH_API_KEY!,
  {
    // 可选：覆盖特定配置
    downloadDir: "./custom-downloads"
  }
);
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

## 🚧 未来扩展方向

项目正在持续发展中，计划实现以下核心功能：

- **🌐 多平台支持** - 扩展支持快手、小红书、B站等主流短视频平台
- **📝 智能文本分析** - 集成关键词提取、内容摘要、情感分析等 AI 功能
- **⚡ 批量处理优化** - 提升大规模视频处理的性能和稳定性
- **🌍 多语言支持** - 支持多种语言的语音识别和文本处理

欢迎在 [Issues](https://github.com/your-repo/douyin-text-extractor/issues) 中讨论和建议！

## 🙏 致谢

感谢以下项目提供的灵感和参考：

- [douyin-mcp-server](https://github.com/yzfly/douyin-mcp-server) - 基于 Model Context Protocol (MCP) 的抖音视频文本提取服务器，为本项目的开发提供了宝贵的思路和参考

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](./LICENSE)
