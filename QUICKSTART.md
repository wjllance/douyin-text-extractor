# 快速开始指南

## 安装

```bash
npm install douyin-text-extractor
```

## 基本使用

### JavaScript

```javascript
const { DouyinService } = require("douyin-text-extractor");

const service = new DouyinService(
  "your-speech-api-key",
  "https://api.siliconflow.cn/v1/audio/transcriptions",
  "FunAudioLLM/SenseVoiceSmall"
);

async function main() {
  const shareLink = "抖音分享链接";

  try {
    const result = await service.extractText(shareLink, (progress) => {
      console.log(`${progress.stage}: ${progress.progress}%`);
    });

    console.log("提取的文本:", result.extractedText);
  } catch (error) {
    console.error("错误:", error.message);
  }
}

main();
```

### TypeScript

```typescript
import { DouyinService, ProcessingProgress } from "douyin-text-extractor";

const service = new DouyinService(
  "your-speech-api-key",
  "https://api.siliconflow.cn/v1/audio/transcriptions",
  "FunAudioLLM/SenseVoiceSmall"
);

async function main(): Promise<void> {
  const shareLink = "抖音分享链接";

  try {
    const result = await service.extractText(
      shareLink,
      (progress: ProcessingProgress) => {
        console.log(`${progress.stage}: ${progress.progress}%`);
      }
    );

    console.log("提取的文本:", result.extractedText);
  } catch (error) {
    console.error("错误:", error instanceof Error ? error.message : "未知错误");
  }
}

main();
```

## 环境变量配置

创建 `.env` 文件：

```env
SPEECH_API_KEY=your-api-key-here
SPEECH_API_BASE_URL=https://api.siliconflow.cn/v1/audio/transcriptions
SPEECH_MODEL=FunAudioLLM/SenseVoiceSmall
TEMP_DIR=./temp
DOWNLOAD_DIR=./downloads
```

## 依赖要求

- Node.js >= 16.0.0
- FFmpeg (系统必须安装)

### 安装 FFmpeg

**macOS:**

```bash
brew install ffmpeg
```

**Ubuntu/Debian:**

```bash
sudo apt update && sudo apt install ffmpeg
```

**Windows:**
下载并安装 FFmpeg，确保添加到系统 PATH。

## 完整示例

```javascript
const { DouyinService } = require("douyin-text-extractor");

const service = new DouyinService(
  process.env.SPEECH_API_KEY,
  process.env.SPEECH_API_BASE_URL,
  process.env.SPEECH_MODEL
);

async function processVideo() {
  const shareLink =
    "7.32 复制打开抖音，看看【示例视频】https://v.douyin.com/xxx/ 复制此链接，打开Dou音搜索，直接观看视频！";

  try {
    // 1. 解析视频信息
    const videoInfo = await service.parseShareUrl(shareLink);
    console.log("视频信息:", videoInfo);

    // 2. 下载视频
    const videoPath = await service.downloadVideo(videoInfo, (progress) => {
      console.log(`下载: ${progress.progress}%`);
    });

    // 3. 提取音频
    const audioPath = await service.extractAudio(videoPath, (progress) => {
      console.log(`音频提取: ${progress.progress}%`);
    });

    // 4. 语音识别
    const text = await service.extractTextFromAudio(audioPath, (progress) => {
      console.log(`语音识别: ${progress.progress}%`);
    });

    console.log("最终文本:", text);
  } catch (error) {
    console.error("处理失败:", error.message);
  }
}

processVideo();
```
