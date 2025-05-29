# 快速开始指南

## 📋 准备工作

### 1. 环境要求

- **Node.js 16+**
- **FFmpeg** (音视频处理必需)
- **语音识别 API 密钥** (如 SiliconFlow)

### 2. 安装 FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows
# 下载安装包: https://ffmpeg.org/download.html
# 确保添加到系统 PATH
```

## 🚀 快速开始

### 1. 安装

```bash
npm install douyin-text-extractor
```

### 2. 基本使用

#### JavaScript 示例

```javascript
const { DouyinService } = require("douyin-text-extractor");

const service = new DouyinService({
  speechApiKey: "your-speech-api-key"
});

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

#### TypeScript 示例

```typescript
import { DouyinService, DouyinServiceOptions, ProcessingProgress } from "douyin-text-extractor";

const options: DouyinServiceOptions = {
  speechApiKey: "your-speech-api-key",
  speechApiBaseUrl: "https://api.siliconflow.cn/v1/audio/transcriptions",
  speechModel: "FunAudioLLM/SenseVoiceSmall",
};

const service = new DouyinService(options);

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

## ⚙️ 配置

### 环境变量配置

创建 `.env` 文件：

```env
SPEECH_API_KEY=your-api-key-here
SPEECH_API_BASE_URL=https://api.siliconflow.cn/v1/audio/transcriptions
SPEECH_MODEL=FunAudioLLM/SenseVoiceSmall
TEMP_DIR=./temp
DOWNLOAD_DIR=./downloads
AUTO_CLEAN_TEMP_FILES=true
LOG_LEVEL=info
```

### 配置说明

| 环境变量                | 默认值                            | 说明              |
| ----------------------- | --------------------------------- | ----------------- |
| `SPEECH_API_KEY`        | 无                                | 语音识别 API 密钥 |
| `SPEECH_API_BASE_URL`   | SiliconFlow API                   | 语音识别 API 地址 |
| `SPEECH_MODEL`          | `FunAudioLLM/SenseVoiceSmall`     | 语音识别模型      |
| `TEMP_DIR`              | `./temp`                          | 临时文件目录      |
| `DOWNLOAD_DIR`          | `./downloads`                     | 下载文件目录      |
| `AUTO_CLEAN_TEMP_FILES` | `true`                            | 自动清理临时文件  |
| `LOG_LEVEL`             | `info`                            | 日志级别          |

## 📖 完整 API 示例

### 分步操作

```javascript
const { DouyinService } = require("douyin-text-extractor");

const service = new DouyinService({
  speechApiKey: process.env.SPEECH_API_KEY,
  speechApiBaseUrl: process.env.SPEECH_API_BASE_URL,
  speechModel: process.env.SPEECH_MODEL,
});

async function processVideo() {
  const shareLink = "7.32 复制打开抖音，看看【示例视频】https://v.douyin.com/xxx/";

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

### 一键提取

```javascript
async function quickExtract() {
  const shareLink = "抖音分享链接";
  
  try {
    const result = await service.extractText(shareLink, (progress) => {
      console.log(`阶段: ${progress.stage}`);
      console.log(`进度: ${progress.progress}%`);
      console.log(`信息: ${progress.message}`);
    });
    
    console.log("视频信息:", result.videoInfo);
    console.log("提取文本:", result.extractedText);
  } catch (error) {
    console.error("提取失败:", error.message);
  }
}
```

## 🔍 错误处理

```javascript
try {
  const result = await service.extractText(shareLink);
} catch (error) {
  if (error.message.includes("未找到有效的分享链接")) {
    console.log("无效的分享链接格式");
  } else if (error.message.includes("语音识别失败")) {
    console.log("语音识别服务出错，请检查 API 密钥");
  } else if (error.message.includes("FFmpeg")) {
    console.log("FFmpeg 未安装或不在 PATH 中");
  } else {
    console.log("其他错误:", error.message);
  }
}
```

## 🎯 使用技巧

### 1. 进度监控

```javascript
const result = await service.extractText(shareLink, (progress) => {
  switch (progress.stage) {
    case 'parsing':
      console.log('🔍 正在解析链接...');
      break;
    case 'downloading':
      console.log(`📥 下载中: ${progress.progress}%`);
      break;
    case 'extracting_audio':
      console.log(`🎵 提取音频: ${progress.progress}%`);
      break;
    case 'speech_recognition':
      console.log(`🗣️ 语音识别: ${progress.progress}%`);
      break;
    case 'completed':
      console.log('✅ 处理完成');
      break;
  }
});
```

### 2. 自定义配置

```javascript
const service = new DouyinService(
  "your-api-key",
  "https://api.siliconflow.cn/v1/audio/transcriptions",
  "FunAudioLLM/SenseVoiceSmall",
  false // 不自动清理临时文件
);

// 设置自定义目录
service.setTempDir('./my-temp');
service.setDownloadDir('./my-downloads');
```

### 3. 批量处理

```javascript
async function batchProcess(shareLinks) {
  const results = [];
  
  for (const link of shareLinks) {
    try {
      console.log(`处理: ${link}`);
      const result = await service.extractText(link);
      results.push({ link, success: true, text: result.extractedText });
      
      // 延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`失败: ${link}`, error.message);
      results.push({ link, success: false, error: error.message });
    }
  }
  
  return results;
}
```

## 📱 常见分享链接格式

支持以下格式的抖音分享链接：

```
# 完整分享文本
7.32 复制打开抖音，看看【xxx】的作品 https://v.douyin.com/xxx/ 复制此链接...

# 纯链接
https://v.douyin.com/xxx/

# 长链接
https://www.iesdouyin.com/share/video/7372484719365098803

# 移动端链接
https://m.douyin.com/video/7372484719365098803
```

## 🐛 常见问题

### FFmpeg 相关

**问题**: `Error: Cannot find ffmpeg`  
**解决**: 确保 FFmpeg 已安装并在系统 PATH 中

### API 相关

**问题**: `未设置语音识别API密钥`  
**解决**: 检查环境变量 `SPEECH_API_KEY` 是否正确设置

**问题**: `语音识别API调用失败`  
**解决**: 检查 API 密钥是否有效，网络是否正常

### 文件权限

**问题**: `ENOENT: no such file or directory`  
**解决**: 确保有写入 temp 和 downloads 目录的权限

## 🔗 下一步

- [命令行工具使用](./CLI.md)
- [开发指南](./DEVELOPMENT.md)
- [API 完整文档](../README.md#api-文档) 