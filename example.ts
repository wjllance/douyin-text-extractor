import {
  DouyinService,
  DouyinServiceOptions,
  DouyinVideoInfo,
  ProcessingProgress,
} from "./src/index";

// 方式1: 使用工厂方法（最简单）
const douyinService1 = DouyinService.create(
  process.env.SPEECH_API_KEY || "your-speech-api-key"
);

// 方式2: 使用构造函数（推荐）
const options: DouyinServiceOptions = {
  speechApiKey: process.env.SPEECH_API_KEY || "your-speech-api-key",
  speechApiBaseUrl: process.env.SPEECH_API_BASE_URL, // 可选，默认使用 SiliconFlow
  speechModel: process.env.SPEECH_MODEL, // 可选，默认使用 FunAudioLLM/SenseVoiceSmall
  autoCleanTempFiles: true, // 可选，默认为 true
  downloadDir: "./downloads", // 可选，默认为 ./downloads
  tempDir: "./temp", // 可选，默认为 ./temp
};
const douyinService = new DouyinService(options);

// 方式3: 使用预设的 API 提供商
const douyinServiceSiliconFlow = DouyinService.createWithSiliconFlow(
  process.env.SPEECH_API_KEY || "your-speech-api-key"
);

const douyinServiceOpenAI = DouyinService.createWithOpenAI(
  process.env.OPENAI_API_KEY || "your-openai-key"
);

// 方式4: 使用全局配置的工厂方法（适合在配置环境中使用）
// 注意：这个方法需要项目配置文件，建议在框架环境中使用
const douyinServiceWithDefaults = (() => {
  try {
    // 仅在有全局配置时使用
    return DouyinService.createWithDefaultConfig(
      process.env.SPEECH_API_KEY || "your-speech-api-key",
      {
        // 可以覆盖特定配置
        autoCleanTempFiles: false,
        downloadDir: "./custom-downloads",
      }
    );
  } catch (error) {
    // 如果没有全局配置，回退到基本方法
    return DouyinService.create(
      process.env.SPEECH_API_KEY || "your-speech-api-key"
    );
  }
})();

async function example(): Promise<void> {
  try {
    // 示例抖音分享链接
    const shareLink =
      "7.32 复制打开抖音，看看【深度解析：ChatGPT和GPT-4】https://v.douyin.com/iRNBho6G/ 复制此链接，打开Dou音搜索，直接观看视频！";

    console.log("开始解析抖音视频...");

    // 解析视频信息
    const videoInfo: DouyinVideoInfo = await douyinService.parseShareUrl(
      shareLink
    );
    console.log("视频信息:", videoInfo);

    // 下载视频
    console.log("开始下载视频...");
    const videoPath: string = await douyinService.downloadVideo(
      videoInfo,
      (progress: ProcessingProgress) => {
        console.log(`下载进度: ${progress.progress}% - ${progress.message}`);
      }
    );
    console.log("视频下载完成:", videoPath);

    // 提取音频
    console.log("开始提取音频...");
    const audioPath: string = await douyinService.extractAudio(
      videoPath,
      (progress: ProcessingProgress) => {
        console.log(`音频提取: ${progress.progress}% - ${progress.message}`);
      }
    );
    console.log("音频提取完成:", audioPath);

    // 从音频提取文本
    console.log("开始语音识别...");
    const extractedText: string = await douyinService.extractTextFromAudio(
      audioPath,
      (progress: ProcessingProgress) => {
        console.log(`语音识别: ${progress.progress}% - ${progress.message}`);
      }
    );
    console.log("文本提取完成:", extractedText);

    // 或者使用一步完成的方法
    console.log("\n使用一步完成的方法:");
    const result = await douyinService.extractText(
      shareLink,
      (progress: ProcessingProgress) => {
        console.log(
          `${progress.stage}: ${progress.progress}% - ${progress.message}`
        );
      }
    );

    console.log("完整结果:", {
      videoInfo: result.videoInfo,
      extractedText: result.extractedText,
    });
  } catch (error) {
    console.error(
      "处理失败:",
      error instanceof Error ? error.message : "未知错误"
    );
  }
}

// 运行示例
if (require.main === module) {
  example().catch(console.error);
}

export { example };
