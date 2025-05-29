# Douyin Video Text Extraction Library

一个 Node.js + TypeScript 库，用于解析抖音/TikTok 视频链接并提取视频中的音频文本。

## 功能特性

- 📱 解析抖音分享链接
- 🎥 获取无水印视频下载链接
- 📥 下载视频文件
- 🎵 提取音频文件
- 🗣️ 语音识别转文本
- 🧹 自动清理临时文件
- 📊 实时进度回调

## 安装

```bash
npm install douyin-text-extractor
```

## 快速开始

```javascript
const { DouyinService } = require("douyin-text-extractor");

// 初始化服务
const douyinService = new DouyinService(
  "your-speech-api-key",
  "https://api.siliconflow.cn/v1/audio/transcriptions",
  "FunAudioLLM/SenseVoiceSmall"
);

async function extractText() {
  const shareLink = "复制的抖音分享链接";

  try {
    // 一步提取文本
    const result = await douyinService.extractText(shareLink, (progress) => {
      console.log(`${progress.stage}: ${progress.progress}%`);
    });

    console.log("提取的文本:", result.extractedText);
  } catch (error) {
    console.error("提取失败:", error.message);
  }
}

extractText();
```

## API 文档

### DouyinService

#### 构造函数

```javascript
new DouyinService(
  speechApiKey,
  speechApiBaseUrl,
  speechModel,
  autoCleanTempFiles
);
```

- `speechApiKey`: 语音识别 API 密钥
- `speechApiBaseUrl`: 语音识别 API 基础 URL
- `speechModel`: 语音识别模型名称
- `autoCleanTempFiles`: 是否自动清理临时文件（默认 true）

#### 方法

##### parseShareUrl(shareText)

解析抖音分享链接，获取视频信息。

```javascript
const videoInfo = await douyinService.parseShareUrl(shareText);
// 返回: { videoId, title, downloadUrl, desc }
```

##### downloadVideo(videoInfo, progressCallback)

下载视频文件。

```javascript
const videoPath = await douyinService.downloadVideo(videoInfo, (progress) => {
  console.log(`下载进度: ${progress.progress}%`);
});
```

##### extractAudio(videoPath, progressCallback)

从视频中提取音频。

```javascript
const audioPath = await douyinService.extractAudio(videoPath, (progress) => {
  console.log(`音频提取: ${progress.progress}%`);
});
```

##### extractTextFromAudio(audioPath, progressCallback)

从音频文件中提取文本。

```javascript
const text = await douyinService.extractTextFromAudio(audioPath, (progress) => {
  console.log(`语音识别: ${progress.progress}%`);
});
```

##### extractText(shareLink, progressCallback)

一步完成：解析链接 → 下载视频 → 提取音频 → 语音识别。

```javascript
const result = await douyinService.extractText(shareLink, (progress) => {
  console.log(`${progress.stage}: ${progress.progress}% - ${progress.message}`);
});
// 返回: { videoInfo, extractedText }
```

## 配置

可以通过环境变量配置：

```bash
export SPEECH_API_KEY="your-api-key"
export SPEECH_API_BASE_URL="https://api.siliconflow.cn/v1/audio/transcriptions"
export SPEECH_MODEL="FunAudioLLM/SenseVoiceSmall"
export TEMP_DIR="./temp"
export DOWNLOAD_DIR="./downloads"
export AUTO_CLEAN_TEMP_FILES="true"
export LOG_LEVEL="info"
```

## TypeScript 支持

库完全支持 TypeScript，包含完整的类型定义：

```typescript
import {
  DouyinService,
  DouyinVideoInfo,
  ProcessingProgress,
} from "douyin-text-extractor";

const service = new DouyinService(apiKey, baseUrl, model);

const result: { videoInfo: DouyinVideoInfo; extractedText: string } =
  await service.extractText(shareLink);
```

## 错误处理

```javascript
try {
  const result = await douyinService.extractText(shareLink);
} catch (error) {
  if (error.message.includes("未找到有效的分享链接")) {
    console.log("无效的分享链接");
  } else if (error.message.includes("语音识别失败")) {
    console.log("语音识别服务出错");
  } else {
    console.log("其他错误:", error.message);
  }
}
```

## 依赖要求

- Node.js >= 16.0.0
- FFmpeg（用于音频处理）

### 安装 FFmpeg

**macOS:**

```bash
brew install ffmpeg
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
下载并安装 FFmpeg，确保添加到系统 PATH 中。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### 1.0.0

- 初始版本
- 支持抖音视频解析和文本提取
- 完整的 TypeScript 支持
