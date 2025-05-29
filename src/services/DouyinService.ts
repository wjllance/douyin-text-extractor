import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";
import FormData from "form-data";
import {
  DouyinVideoInfo,
  SpeechApiResponse,
  ProcessingProgress,
  DouyinServiceOptions,
} from "../types";
import { FileUtils } from "../utils/fileUtils";
import logger from "../utils/logger";

export class DouyinService {
  private readonly userAgent =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/121.0.2277.107 Version/17.0 Mobile/15E148 Safari/604.1";
  private readonly speechApiKey: string;
  private readonly speechApiBaseUrl: string;
  private readonly speechModel: string;
  private readonly autoCleanTempFiles: boolean;
  private readonly downloadDir: string;
  private readonly tempDir: string;

  /**
   * 创建 DouyinService 实例
   * @param options 配置选项
   * @example
   * ```typescript
   * // 基本用法（仅提供必需参数）
   * const service = new DouyinService({
   *   speechApiKey: "your-api-key"
   * });
   * 
   * // 完整配置
   * const service = new DouyinService({
   *   speechApiKey: "your-api-key",
   *   speechApiBaseUrl: "https://api.custom.com/v1/audio/transcriptions",
   *   speechModel: "whisper-1",
   *   autoCleanTempFiles: false,
   *   downloadDir: "./custom-downloads",
   *   tempDir: "./custom-temp"
   * });
   * ```
   */
  constructor(options: DouyinServiceOptions) {
    // 设置默认值
    const {
      speechApiKey,
      speechApiBaseUrl = "https://api.siliconflow.cn/v1/audio/transcriptions",
      speechModel = "FunAudioLLM/SenseVoiceSmall",
      autoCleanTempFiles = true,
      downloadDir = path.join(process.cwd(), "downloads"),
      tempDir = path.join(process.cwd(), "temp"),
    } = options;

    if (!speechApiKey) {
      throw new Error("speechApiKey is required");
    }

    this.speechApiKey = speechApiKey;
    this.speechApiBaseUrl = speechApiBaseUrl;
    this.speechModel = speechModel;
    this.autoCleanTempFiles = autoCleanTempFiles;
    this.downloadDir = downloadDir;
    this.tempDir = tempDir;

    logger.info("DouyinService initialized", {
      speechApiBaseUrl: this.speechApiBaseUrl,
      speechModel: this.speechModel,
      hasApiKey: !!this.speechApiKey,
      autoCleanTempFiles: this.autoCleanTempFiles,
      downloadDir: this.downloadDir,
      tempDir: this.tempDir,
    });
  }

  /**
   * 创建 DouyinService 实例的简化方法（使用默认配置）
   * @param speechApiKey 语音识别 API 密钥
   * @returns DouyinService 实例
   * @example
   * ```typescript
   * const service = DouyinService.create("your-api-key");
   * ```
   */
  static create(speechApiKey: string): DouyinService {
    return new DouyinService({ speechApiKey });
  }

  /**
   * 创建 DouyinService 实例（使用 SiliconFlow API）
   * @param speechApiKey 语音识别 API 密钥
   * @param speechModel 可选：语音识别模型
   * @returns DouyinService 实例
   * @example
   * ```typescript
   * const service = DouyinService.createWithSiliconFlow("your-api-key");
   * // 或自定义模型
   * const service = DouyinService.createWithSiliconFlow("your-api-key", "custom-model");
   * ```
   */
  static createWithSiliconFlow(
    speechApiKey: string,
    speechModel: string = "FunAudioLLM/SenseVoiceSmall"
  ): DouyinService {
    return new DouyinService({
      speechApiKey,
      speechApiBaseUrl: "https://api.siliconflow.cn/v1/audio/transcriptions",
      speechModel,
    });
  }

  /**
   * 创建 DouyinService 实例（使用 OpenAI API）
   * @param speechApiKey OpenAI API 密钥
   * @param speechModel 可选：语音识别模型
   * @returns DouyinService 实例
   * @example
   * ```typescript
   * const service = DouyinService.createWithOpenAI("your-openai-key");
   * // 或自定义模型
   * const service = DouyinService.createWithOpenAI("your-openai-key", "whisper-1");
   * ```
   */
  static createWithOpenAI(
    speechApiKey: string,
    speechModel: string = "whisper-1"
  ): DouyinService {
    return new DouyinService({
      speechApiKey,
      speechApiBaseUrl: "https://api.openai.com/v1/audio/transcriptions",
      speechModel,
    });
  }

  /**
   * @deprecated 建议直接使用构造函数或其他工厂方法
   * 向后兼容的方法，现在直接从环境变量读取配置
   */
  static createWithDefaultConfig(
    speechApiKey: string,
    overrides?: Partial<Omit<DouyinServiceOptions, 'speechApiKey'>>
  ): DouyinService {
    const defaultConfig = {
      speechApiKey,
      speechApiBaseUrl: process.env.SPEECH_API_BASE_URL || "https://api.siliconflow.cn/v1/audio/transcriptions",
      speechModel: process.env.SPEECH_MODEL || "FunAudioLLM/SenseVoiceSmall",
      autoCleanTempFiles: process.env.AUTO_CLEAN_TEMP_FILES !== "false",
      downloadDir: process.env.DOWNLOAD_DIR || path.join(process.cwd(), "downloads"),
      tempDir: process.env.TEMP_DIR || path.join(process.cwd(), "temp"),
      ...overrides,
    };
    
    return new DouyinService(defaultConfig);
  }

  /**
   * 从分享链接解析抖音视频信息
   */
  async parseShareUrl(shareText: string, maxRetries: number = 3): Promise<DouyinVideoInfo> {
    const startTime = Date.now();
    logger.info("开始解析抖音分享链接", { shareText, maxRetries });

    // 提取分享链接
    const urlRegex =
      /http[s]?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*(),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/g;
    const urls = shareText.match(urlRegex);

    if (!urls || urls.length === 0) {
      logger.error("未找到有效的分享链接", { shareText });
      throw new Error("未找到有效的分享链接");
    }

    const shareUrl = urls[0];
    logger.info("提取到分享链接", { shareUrl });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`尝试解析 (${attempt}/${maxRetries})`, { shareUrl, attempt, maxRetries });

        // 获取重定向后的真实URL
        logger.debug("获取重定向后的真实URL", { shareUrl });
        const shareResponse = await axios.get(shareUrl, {
          headers: { "User-Agent": this.userAgent },
          maxRedirects: 5,
          timeout: 10000, // 10秒超时
        });

        // 添加更详细的重定向分析
        logger.debug("重定向响应详情", {
          status: shareResponse.status,
          statusText: shareResponse.statusText,
          finalUrl: shareResponse.request.res.responseUrl,
          redirectCount: shareResponse.request._redirects?.length || 0,
          cookies: shareResponse.headers['set-cookie'] || [],
          responseHeaders: {
            contentType: shareResponse.headers['content-type'],
            server: shareResponse.headers['server'],
            location: shareResponse.headers['location']
          }
        });

        const videoId = shareResponse.request.res.responseUrl
          .split("?")[0]
          .trim()
          .split("/")
          .pop();

        logger.info("提取到视频ID", {
          videoId,
          finalUrl: shareResponse.request.res.responseUrl,
        });

        const pageUrl = `https://www.iesdouyin.com/share/video/${videoId}`;

        // 获取视频页面内容
        logger.debug("获取视频页面内容", { pageUrl, attempt });
        const pageResponse = await axios.get(pageUrl, {
          headers: { 
            "User-Agent": this.userAgent,
            // 尝试添加更多常见的浏览器请求头
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
          },
          timeout: 15000, // 15秒超时
        });

        // 添加详细的页面响应分析
        logger.debug("页面响应详情", {
          status: pageResponse.status,
          statusText: pageResponse.statusText,
          contentLength: pageResponse.data.length,
          contentType: pageResponse.headers['content-type'],
          server: pageResponse.headers['server'],
          cookies: pageResponse.headers['set-cookie'] || [],
          responseHeaders: Object.keys(pageResponse.headers),
          hasSetCookie: !!pageResponse.headers['set-cookie'],
          finalUrl: pageResponse.request.res?.responseUrl || pageUrl,
          attempt
        });

        // 分析HTML内容
        const htmlContent = pageResponse.data;
        const htmlPreview = htmlContent.substring(0, 500);
        
        logger.debug("HTML内容分析", {
          htmlLength: htmlContent.length,
          htmlPreview: htmlPreview,
          containsRouterData: htmlContent.includes('window._ROUTER_DATA'),
          containsVideoInfo: htmlContent.includes('videoInfoRes'),
          containsItemList: htmlContent.includes('item_list'),
          containsScript: htmlContent.includes('<script>'),
          containsDouyin: htmlContent.includes('douyin'),
          containsTitle: htmlContent.includes('<title>'),
          titleMatch: htmlContent.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || 'No title found',
          attempt
        });

        // 检查是否被重定向到登录页面或其他页面
        const needsAuth = htmlContent.includes('登录') || htmlContent.includes('login') || 
                         htmlContent.includes('验证') || htmlContent.includes('captcha');
        
        if (needsAuth) {
          logger.warn("页面可能要求登录或验证", {
            videoId,
            pageUrl,
            containsLogin: htmlContent.includes('登录'),
            containsCaptcha: htmlContent.includes('captcha'),
            containsVerify: htmlContent.includes('验证'),
            attempt,
            willRetry: attempt < maxRetries
          });
          
          // 如果检测到需要验证且还有重试次数，则等待后重试
          if (attempt < maxRetries) {
            const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 指数退避，最大5秒
            logger.info(`等待 ${retryDelay}ms 后重试`, { attempt, retryDelay });
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }

        // 解析页面中的JSON数据
        const pattern = /window\._ROUTER_DATA\s*=\s*(.*?)<\/script>/s;
        const match = pageResponse.data.match(pattern);

        if (!match || !match[1]) {
          // 添加更多调试信息
          const errorInfo = {
            videoId,
            pageUrl,
            hasMatch: !!match,
            matchLength: match?.[1]?.length,
            htmlLength: htmlContent.length,
            attempt,
            needsAuth,
            possiblePatterns: {
              hasWindowObject: htmlContent.includes('window.'),
              hasRouterData: htmlContent.includes('_ROUTER_DATA'),
              hasVideoData: htmlContent.includes('videoData'),
              hasInitialProps: htmlContent.includes('__INITIAL_PROPS__'),
              hasNextData: htmlContent.includes('__NEXT_DATA__')
            },
            // 尝试查找其他可能的数据模式
            alternativePatterns: [
              htmlContent.match(/window\.__INITIAL_STATE__\s*=\s*.*?<\/script>/s) ? 'INITIAL_STATE found' : null,
              htmlContent.match(/window\.__NUXT__\s*=\s*.*?<\/script>/s) ? 'NUXT found' : null,
              htmlContent.match(/"videoInfoRes":\s*{/s) ? 'videoInfoRes in plain text' : null
            ].filter(Boolean)
          };
          
          logger.error("从HTML中解析视频信息失败", errorInfo);
          
          // 如果还有重试次数，继续重试
          if (attempt < maxRetries) {
            const retryDelay = Math.min(2000 * Math.pow(2, attempt - 1), 10000); // 指数退避，最大10秒
            logger.info(`解析失败，等待 ${retryDelay}ms 后重试`, { attempt, retryDelay });
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            lastError = new Error("从HTML中解析视频信息失败");
            continue;
          }
          
          // 如果找不到ROUTER_DATA，尝试搜索其他可能的数据源
          const alternativePatterns = [
            /window\.__INITIAL_STATE__\s*=\s*(.*?)<\/script>/s,
            /window\.__NUXT__\s*=\s*(.*?)<\/script>/s,
            /"videoInfoRes":\s*({.*?})/s
          ];
          
          for (const altPattern of alternativePatterns) {
            const altMatch = htmlContent.match(altPattern);
            if (altMatch) {
              logger.info("找到替代数据模式", {
                pattern: altPattern.toString(),
                matchLength: altMatch[1]?.length,
                attempt
              });
            }
          }
          
          throw new Error("从HTML中解析视频信息失败");
        }

        logger.debug("成功匹配JSON数据", { 
          jsonLength: match[1].length,
          jsonPreview: match[1].substring(0, 200) + (match[1].length > 200 ? '...' : ''),
          attempt
        });

        const jsonData = JSON.parse(match[1].trim());
        const VIDEO_ID_PAGE_KEY = "video_(id)/page";
        const NOTE_ID_PAGE_KEY = "note_(id)/page";

        // 添加JSON数据结构分析
        logger.debug("JSON数据结构分析", {
          hasLoaderData: !!jsonData.loaderData,
          loaderDataKeys: Object.keys(jsonData.loaderData || {}),
          expectedVideoKey: VIDEO_ID_PAGE_KEY,
          expectedNoteKey: NOTE_ID_PAGE_KEY,
          hasVideoKey: !!jsonData.loaderData?.[VIDEO_ID_PAGE_KEY],
          hasNoteKey: !!jsonData.loaderData?.[NOTE_ID_PAGE_KEY],
          attempt
        });

        let originalVideoInfo;
        if (jsonData.loaderData[VIDEO_ID_PAGE_KEY]) {
          originalVideoInfo = jsonData.loaderData[VIDEO_ID_PAGE_KEY].videoInfoRes;
          logger.debug("使用视频页面数据", { pageKey: VIDEO_ID_PAGE_KEY, attempt });
        } else if (jsonData.loaderData[NOTE_ID_PAGE_KEY]) {
          originalVideoInfo = jsonData.loaderData[NOTE_ID_PAGE_KEY].videoInfoRes;
          logger.debug("使用笔记页面数据", { pageKey: NOTE_ID_PAGE_KEY, attempt });
        } else {
          const availableKeys = Object.keys(jsonData.loaderData || {});
          logger.error("无法从JSON中解析视频或图集信息", {
            videoId,
            availableKeys,
            hasLoaderData: !!jsonData.loaderData,
            jsonDataKeys: Object.keys(jsonData),
            loaderDataStructure: jsonData.loaderData ? Object.keys(jsonData.loaderData).map(key => ({
              key,
              hasVideoInfoRes: !!jsonData.loaderData[key]?.videoInfoRes,
              hasItemList: !!jsonData.loaderData[key]?.videoInfoRes?.item_list
            })) : [],
            attempt
          });
          throw new Error("无法从JSON中解析视频或图集信息");
        }

        const data = originalVideoInfo.item_list[0];

        // 获取无水印视频URL
        const videoUrl = data.video.play_addr.url_list[0].replace(
          "playwm",
          "play"
        );
        const desc = data.desc?.trim() || `douyin_${videoId}`;
        const title = FileUtils.sanitizeFilename(desc);

        const result = {
          videoId,
          title,
          downloadUrl: videoUrl,
          desc,
        };

        const processingTime = Date.now() - startTime;
        logger.info("视频信息解析完成", {
          ...result,
          processingTime: `${processingTime}ms`,
          attempts: attempt,
          successful: true
        });

        return result;
        
      } catch (error) {
        lastError = error as Error;
        const processingTime = Date.now() - startTime;
        
        logger.warn(`解析尝试 ${attempt}/${maxRetries} 失败`, {
          shareUrl,
          error: error instanceof Error ? error.message : "未知错误",
          processingTime: `${processingTime}ms`,
          attempt,
          willRetry: attempt < maxRetries,
          stack: error instanceof Error ? error.stack : undefined,
        });

        // 如果还有重试次数，等待后继续
        if (attempt < maxRetries) {
          const retryDelay = Math.min(3000 * Math.pow(2, attempt - 1), 15000); // 指数退避，最大15秒
          logger.info(`等待 ${retryDelay}ms 后进行第 ${attempt + 1} 次尝试`, { 
            attempt: attempt + 1, 
            maxRetries, 
            retryDelay 
          });
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // 所有重试都失败了
    const totalProcessingTime = Date.now() - startTime;
    logger.error("解析抖音链接最终失败", {
      shareUrl,
      maxRetries,
      totalProcessingTime: `${totalProcessingTime}ms`,
      lastError: lastError?.message || "未知错误",
      stack: lastError?.stack
    });
    
    throw new Error(
      `解析抖音链接失败 (已重试 ${maxRetries} 次): ${lastError?.message || "未知错误"}`
    );
  }

  /**
   * 下载视频文件
   */
  async downloadVideo(
    videoInfo: DouyinVideoInfo,
    progressCallback?: (progress: ProcessingProgress) => void
  ): Promise<string> {
    const startTime = Date.now();
    logger.info("开始下载视频", {
      videoId: videoInfo.videoId,
      title: videoInfo.title,
      downloadUrl: videoInfo.downloadUrl,
      downloadDir: this.downloadDir,
    });

    // 确保下载目录存在
    if (!fs.existsSync(this.downloadDir)) {
      logger.info("创建下载目录", { downloadDir: this.downloadDir });
      fs.mkdirSync(this.downloadDir, { recursive: true });
      logger.debug("下载目录创建成功");
    }

    // 使用 videoId 作为文件名
    const fileName = `${videoInfo.videoId}.mp4`;
    const videoPath = path.join(this.downloadDir, fileName);

    logger.debug("生成文件路径", { fileName, videoPath });

    // 检查文件是否已存在，如果存在则跳过下载
    if (fs.existsSync(videoPath)) {
      const stats = fs.statSync(videoPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      logger.info("文件已存在，跳过下载", {
        videoId: videoInfo.videoId,
        filePath: videoPath,
        fileSize: `${fileSizeMB}MB`,
        modifiedTime: stats.mtime.toISOString(),
      });

      progressCallback?.({
        stage: "downloading",
        progress: 100,
        message: `视频已存在，跳过下载: ${videoInfo.videoId}`,
      });
      return videoPath;
    }

    try {
      progressCallback?.({
        stage: "downloading",
        progress: 0,
        message: `开始下载视频: ${videoInfo.title} (${videoInfo.videoId})`,
      });

      logger.debug("开始HTTP请求下载", {
        url: videoInfo.downloadUrl,
        userAgent: this.userAgent,
      });

      const response = await axios({
        method: "GET",
        url: videoInfo.downloadUrl,
        headers: { "User-Agent": this.userAgent },
        responseType: "stream",
      });

      const totalSize = parseInt(response.headers["content-length"] || "0", 10);
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      let downloadedSize = 0;

      logger.info("开始流式下载", {
        videoId: videoInfo.videoId,
        totalSize: `${totalSizeMB}MB`,
        status: response.status,
        headers: {
          contentType: response.headers["content-type"],
          contentLength: response.headers["content-length"],
        },
      });

      const writer = fs.createWriteStream(videoPath);

      response.data.on("data", (chunk: Buffer) => {
        downloadedSize += chunk.length;
        const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;

        // 每10%记录一次日志，避免日志过多
        if (Math.floor(progress) % 10 === 0 && progress > 0) {
          logger.debug("下载进度更新", {
            videoId: videoInfo.videoId,
            progress: `${Math.round(progress)}%`,
            downloaded: `${(downloadedSize / (1024 * 1024)).toFixed(2)}MB`,
            total: `${totalSizeMB}MB`,
          });
        }

        progressCallback?.({
          stage: "downloading",
          progress: Math.round(progress),
          message: `下载进度: ${Math.round(progress)}% (${videoInfo.videoId})`,
        });
      });

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", () => {
          const processingTime = Date.now() - startTime;
          const finalStats = fs.statSync(videoPath);
          const finalSizeMB = (finalStats.size / (1024 * 1024)).toFixed(2);

          logger.info("视频下载完成", {
            videoId: videoInfo.videoId,
            filePath: videoPath,
            fileSize: `${finalSizeMB}MB`,
            processingTime: `${processingTime}ms`,
            downloadSpeed: `${(
              finalStats.size /
              (processingTime / 1000) /
              (1024 * 1024)
            ).toFixed(2)}MB/s`,
          });

          progressCallback?.({
            stage: "downloading",
            progress: 100,
            message: `视频下载完成: ${videoInfo.videoId}`,
          });
          resolve(videoPath);
        });

        writer.on("error", (error: Error) => {
          const processingTime = Date.now() - startTime;
          logger.error("视频下载失败", {
            videoId: videoInfo.videoId,
            filePath: videoPath,
            error: error.message,
            processingTime: `${processingTime}ms`,
            stack: error.stack,
          });

          FileUtils.deleteFile(videoPath);
          reject(new Error(`下载视频失败: ${error.message}`));
        });
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error("下载视频异常", {
        videoId: videoInfo.videoId,
        filePath: videoPath,
        error: error instanceof Error ? error.message : "未知错误",
        processingTime: `${processingTime}ms`,
        stack: error instanceof Error ? error.stack : undefined,
      });

      FileUtils.deleteFile(videoPath);
      throw new Error(
        `下载视频失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 从视频中提取音频
   */
  async extractAudio(
    videoPath: string,
    progressCallback?: (progress: ProcessingProgress) => void
  ): Promise<string> {
    const startTime = Date.now();
    const audioPath = videoPath.replace(".mp4", ".mp3");

    logger.info("开始提取音频", {
      videoPath,
      audioPath,
      videoExists: fs.existsSync(videoPath),
    });

    if (!fs.existsSync(videoPath)) {
      logger.error("视频文件不存在", { videoPath });
      throw new Error(`视频文件不存在: ${videoPath}`);
    }

    const videoStats = fs.statSync(videoPath);
    logger.debug("视频文件信息", {
      size: `${(videoStats.size / (1024 * 1024)).toFixed(2)}MB`,
      created: videoStats.birthtime.toISOString(),
      modified: videoStats.mtime.toISOString(),
    });

    return new Promise((resolve, reject) => {
      progressCallback?.({
        stage: "extracting_audio",
        progress: 0,
        message: "开始提取音频",
      });

      const ffmpegCommand = ffmpeg(videoPath)
        .audioCodec("libmp3lame")
        .audioQuality(0)
        .on("start", (commandLine) => {
          logger.debug("FFmpeg 命令开始执行", {
            commandLine,
            videoPath,
            audioPath,
          });
          progressCallback?.({
            stage: "extracting_audio",
            progress: 10,
            message: "正在提取音频...",
          });
        })
        .on("progress", (progress: any) => {
          const percent = Math.round(progress.percent || 0);

          // 每20%记录一次详细日志
          if (percent % 20 === 0 && percent > 0) {
            logger.debug("音频提取进度", {
              percent: `${percent}%`,
              timemark: progress.timemark,
              currentFps: progress.currentFps,
              targetSize: progress.targetSize,
            });
          }

          progressCallback?.({
            stage: "extracting_audio",
            progress: percent,
            message: `音频提取进度: ${percent}%`,
          });
        })
        .on("end", () => {
          const processingTime = Date.now() - startTime;

          if (fs.existsSync(audioPath)) {
            const audioStats = fs.statSync(audioPath);
            logger.info("音频提取完成", {
              videoPath,
              audioPath,
              audioSize: `${(audioStats.size / (1024 * 1024)).toFixed(2)}MB`,
              processingTime: `${processingTime}ms`,
            });
          } else {
            logger.error("音频文件未生成", { audioPath });
          }

          progressCallback?.({
            stage: "extracting_audio",
            progress: 100,
            message: "音频提取完成",
          });
          resolve(audioPath);
        })
        .on("error", (error: Error) => {
          const processingTime = Date.now() - startTime;
          logger.error("音频提取失败", {
            videoPath,
            audioPath,
            error: error.message,
            processingTime: `${processingTime}ms`,
            stack: error.stack,
          });

          FileUtils.deleteFile(audioPath);
          reject(new Error(`提取音频失败: ${error.message}`));
        });

      ffmpegCommand.save(audioPath);
    });
  }

  /**
   * 从音频中提取文本
   */
  async extractTextFromAudio(
    audioPath: string,
    progressCallback?: (progress: ProcessingProgress) => void
  ): Promise<string> {
    const startTime = Date.now();

    logger.info("开始语音识别", {
      audioPath,
      audioExists: fs.existsSync(audioPath),
      speechApiBaseUrl: this.speechApiBaseUrl,
      speechModel: this.speechModel,
    });

    if (!fs.existsSync(audioPath)) {
      logger.error("音频文件不存在", { audioPath });
      throw new Error(`音频文件不存在: ${audioPath}`);
    }

    const audioStats = fs.statSync(audioPath);
    logger.debug("音频文件信息", {
      size: `${(audioStats.size / (1024 * 1024)).toFixed(2)}MB`,
      duration: "unknown", // FFmpeg probe 可以获取准确时长
      created: audioStats.birthtime.toISOString(),
    });

    try {
      progressCallback?.({
        stage: "speech_recognition",
        progress: 0,
        message: "开始语音识别",
      });

      const formData = new FormData();
      formData.append("file", fs.createReadStream(audioPath));
      formData.append("model", this.speechModel);

      logger.debug("准备API请求", {
        apiUrl: this.speechApiBaseUrl,
        model: this.speechModel,
        fileSize: `${(audioStats.size / (1024 * 1024)).toFixed(2)}MB`,
      });

      const response = await axios.post<SpeechApiResponse>(
        this.speechApiBaseUrl,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${this.speechApiKey}`,
          },
        }
      );

      const processingTime = Date.now() - startTime;
      const extractedText = response.data.text || "未能识别出文本内容";

      logger.info("语音识别完成", {
        audioPath,
        textLength: extractedText.length,
        processingTime: `${processingTime}ms`,
        apiStatus: response.status,
        hasText: !!response.data.text,
      });

      logger.debug("识别结果预览", {
        textPreview:
          extractedText.substring(0, 100) +
          (extractedText.length > 100 ? "..." : ""),
        fullTextLength: extractedText.length,
      });

      progressCallback?.({
        stage: "speech_recognition",
        progress: 100,
        message: "语音识别完成",
      });

      return extractedText;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error("语音识别失败", {
        audioPath,
        error: error instanceof Error ? error.message : "未知错误",
        processingTime: `${processingTime}ms`,
        apiUrl: this.speechApiBaseUrl,
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new Error(
        `语音识别失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 完整的文本提取流程
   */
  async extractText(
    shareLink: string,
    progressCallback?: (progress: ProcessingProgress) => void,
    maxRetries: number = 3
  ): Promise<{ videoInfo: DouyinVideoInfo; extractedText: string }> {
    const overallStartTime = Date.now();
    const tempFiles: string[] = [];

    logger.info("开始完整文本提取流程", { shareLink, maxRetries });

    try {
      // 1. 解析链接
      logger.debug("步骤1: 解析链接");
      progressCallback?.({
        stage: "parsing",
        progress: 0,
        message: "正在解析抖音链接",
      });

      const videoInfo = await this.parseShareUrl(shareLink, maxRetries);

      progressCallback?.({
        stage: "parsing",
        progress: 100,
        message: "链接解析完成",
      });

      // 2. 下载视频
      logger.debug("步骤2: 下载视频");
      const videoPath = await this.downloadVideo(videoInfo, progressCallback);
      tempFiles.push(videoPath);

      // 3. 提取音频
      logger.debug("步骤3: 提取音频");
      const audioPath = await this.extractAudio(videoPath, progressCallback);
      tempFiles.push(audioPath);

      // 4. 语音识别
      logger.debug("步骤4: 语音识别");
      const extractedText = await this.extractTextFromAudio(
        audioPath,
        progressCallback
      );

      // 5. 清理临时文件（根据配置）
      if (this.autoCleanTempFiles) {
        logger.debug("步骤5: 清理临时文件");
        progressCallback?.({
          stage: "cleaning",
          progress: 0,
          message: "正在清理临时文件",
        });

        const deletedFiles = FileUtils.deleteFiles(tempFiles);
        logger.info("临时文件清理完成", {
          deletedFiles,
          tempFilesCount: tempFiles.length,
        });
      } else {
        logger.info("跳过自动清理临时文件", {
          tempFiles,
          tempFilesCount: tempFiles.length,
          reason: "autoCleanTempFiles配置为false",
        });
      }

      progressCallback?.({
        stage: "completed",
        progress: 100,
        message: "处理完成",
      });

      const totalProcessingTime = Date.now() - overallStartTime;

      logger.info("文本提取流程完成", {
        videoId: videoInfo.videoId,
        textLength: extractedText.length,
        totalProcessingTime: `${totalProcessingTime}ms`,
        tempFilesProcessed: tempFiles.length,
        tempFilesRetained: !this.autoCleanTempFiles ? tempFiles.length : 0,
        maxRetries,
      });

      return { videoInfo, extractedText };
    } catch (error) {
      const totalProcessingTime = Date.now() - overallStartTime;

      logger.error("文本提取流程失败", {
        shareLink,
        error: error instanceof Error ? error.message : "未知错误",
        totalProcessingTime: `${totalProcessingTime}ms`,
        tempFiles,
        maxRetries,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // 清理临时文件（根据配置，异常情况下也遵循配置）
      if (this.autoCleanTempFiles) {
        logger.debug("清理异常情况下的临时文件");
        const deletedFiles = FileUtils.deleteFiles(tempFiles);
        logger.info("异常清理完成", { deletedFiles });
      } else {
        logger.info("跳过异常情况下的临时文件清理", {
          tempFiles,
          tempFilesCount: tempFiles.length,
          reason: "autoCleanTempFiles配置为false",
        });
      }

      throw error;
    }
  }

  /**
   * 手动清理指定的临时文件
   * 当autoCleanTempFiles为false时，可以使用此方法手动清理文件
   */
  cleanupTempFiles(tempFiles: string[]): {
    deletedFiles: string[];
    errors: string[];
  } {
    logger.info("开始手动清理临时文件", {
      tempFiles,
      tempFilesCount: tempFiles.length,
    });

    const result = FileUtils.deleteFiles(tempFiles);

    logger.info("手动清理临时文件完成", {
      deletedFiles: result.deletedFiles,
      errors: result.errors,
      deletedCount: result.deletedFiles.length,
      errorCount: result.errors.length,
    });

    return result;
  }

  /**
   * 获取当前自动清理配置状态
   */
  getAutoCleanTempFilesStatus(): boolean {
    return this.autoCleanTempFiles;
  }
}
