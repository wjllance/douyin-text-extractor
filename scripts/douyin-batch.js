#!/usr/bin/env node

/**
 * 抖音视频批量处理命令行工具
 * 功能：批量处理多个抖音视频链接
 * 使用：node scripts/douyin-batch.js <链接文件> [选项]
 */

const path = require("path");
const fs = require("fs");

// 添加TypeScript编译后的路径到模块搜索路径
require("module").globalPaths.push(path.resolve(__dirname, "../dist"));

// load .env
require("dotenv").config();

// 颜色配置
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

class DouyinBatchProcessor {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  log(message, color = "reset") {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  logSuccess(message) {
    this.log(`✅ ${message}`, "green");
  }

  logError(message) {
    this.log(`❌ ${message}`, "red");
  }

  logWarning(message) {
    this.log(`⚠️  ${message}`, "yellow");
  }

  logInfo(message) {
    this.log(`ℹ️  ${message}`, "blue");
  }

  logStep(message) {
    this.log(`\n🔄 ${message}`, "cyan");
  }

  // 显示处理进度
  showOverallProgress(current, total, message) {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((40 * current) / total);
    const empty = 40 - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);

    console.log(
      `\n${COLORS.cyan}总进度 [${bar}] ${current}/${total} (${percentage}%) - ${message}${COLORS.reset}`
    );
  }

  // 加载并初始化服务
  async initializeService() {
    try {
      // 动态导入编译后的模块
      const { DouyinService } = require("../dist/services/DouyinService");

      const speechApiKey = process.env.SPEECH_API_KEY;
      if (!speechApiKey) {
        this.logWarning("未设置 SPEECH_API_KEY，将跳过文本提取功能");
        return DouyinService.createWithEnvDefaults("dummy-key");
      }

      return DouyinService.createWithEnvDefaults(speechApiKey);
    } catch (error) {
      if (error.code === "MODULE_NOT_FOUND") {
        throw new Error("项目未编译，请先运行: npm run build");
      }
      throw error;
    }
  }

  // 从文件读取链接列表
  readLinksFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .filter((line) => line.includes("douyin.com"));

      if (lines.length === 0) {
        throw new Error("文件中没有找到有效的抖音链接");
      }

      return lines;
    } catch (error) {
      throw new Error(`读取链接文件失败: ${error.message}`);
    }
  }

  // 处理单个视频
  async processSingleVideo(shareLink, service, options, index, total) {
    const startTime = Date.now();
    const result = {
      index: index + 1,
      shareLink,
      success: false,
      videoInfo: null,
      extractedText: null,
      outputPath: null,
      error: null,
      duration: 0,
    };

    try {
      this.showOverallProgress(index, total, `处理第 ${index + 1} 个视频`);

      // 解析视频信息
      const videoInfo = await service.parseShareUrl(shareLink);
      result.videoInfo = videoInfo;

      if (options.mode === "download" || options.mode === "both") {
        // 下载视频
        let outputPath;
        if (options.outputDir) {
          outputPath = path.join(options.outputDir, `${videoInfo.title}.mp4`);
        } else {
          outputPath = `${videoInfo.title}.mp4`;
        }

        const tempVideoPath = await service.downloadVideo(videoInfo);
        fs.renameSync(tempVideoPath, outputPath);
        result.outputPath = outputPath;
      }

      if (options.mode === "text" || options.mode === "both") {
        // 提取文本
        if (options.hasApiKey) {
          const extractResult = await service.extractText(shareLink);
          result.extractedText = extractResult.extractedText;
        } else {
          result.extractedText = "跳过（无API密钥）";
        }
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      this.logSuccess(`第 ${index + 1} 个视频处理完成: ${videoInfo.title}`);
      return result;
    } catch (error) {
      result.error = error.message;
      result.duration = Date.now() - startTime;
      this.logError(`第 ${index + 1} 个视频处理失败: ${error.message}`);
      return result;
    }
  }

  // 批量处理视频
  async batchProcess(linksFile, options = {}) {
    this.log("\n🎬 抖音视频批量处理工具", "bright");
    this.log("=".repeat(60), "cyan");

    const startTime = Date.now();

    try {
      this.logStep("初始化服务");
      const service = await this.initializeService();

      this.logStep("读取链接文件");
      const links = this.readLinksFromFile(linksFile);
      this.logInfo(`找到 ${links.length} 个有效链接`);

      // 检查API密钥
      const speechApiKey = process.env.SPEECH_API_KEY;
      options.hasApiKey = !!speechApiKey;

      if (
        !options.hasApiKey &&
        (options.mode === "text" || options.mode === "both")
      ) {
        this.logWarning("未设置 SPEECH_API_KEY，文本提取功能将被跳过");
      }

      // 创建输出目录
      if (options.outputDir && !fs.existsSync(options.outputDir)) {
        fs.mkdirSync(options.outputDir, { recursive: true });
      }

      this.logStep("开始批量处理");

      // 处理每个视频
      for (let i = 0; i < links.length; i++) {
        const result = await this.processSingleVideo(
          links[i],
          service,
          options,
          i,
          links.length
        );
        this.results.push(result);

        if (!result.success) {
          this.errors.push(result);
        }

        // 添加延迟避免过于频繁的请求
        if (i < links.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, options.delay || 2000)
          );
        }
      }

      const endTime = Date.now();
      const totalDuration = Math.round((endTime - startTime) / 1000);

      // 生成报告
      await this.generateReport(options.outputDir, totalDuration);

      return this.results;
    } catch (error) {
      this.logError(`批量处理失败: ${error.message}`);
      throw error;
    }
  }

  // 生成处理报告
  async generateReport(outputDir, totalDuration) {
    this.log("\n📊 处理报告", "bright");
    this.log("=".repeat(60), "cyan");

    const successCount = this.results.filter((r) => r.success).length;
    const failureCount = this.results.filter((r) => !r.success).length;
    const totalCount = this.results.length;

    this.logInfo(`总计处理: ${totalCount} 个视频`);
    this.logSuccess(`成功: ${successCount} 个`);
    if (failureCount > 0) {
      this.logError(`失败: ${failureCount} 个`);
    }
    this.logInfo(`总耗时: ${totalDuration} 秒`);

    // 生成详细报告文件
    const reportPath = outputDir
      ? path.join(outputDir, "batch_report.json")
      : "batch_report.json";
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalCount,
        success: successCount,
        failure: failureCount,
        duration: totalDuration,
      },
      results: this.results,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.logSuccess(`详细报告已保存到: ${reportPath}`);

    // 显示失败的项目
    if (this.errors.length > 0) {
      this.log("\n❌ 失败的项目:", "red");
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.shareLink}`);
        console.log(`   错误: ${error.error}`);
      });
    }

    // 生成文本摘要（如果有文本提取）
    const textResults = this.results.filter(
      (r) =>
        r.success && r.extractedText && r.extractedText !== "跳过（无API密钥）"
    );
    if (textResults.length > 0) {
      const summaryPath = outputDir
        ? path.join(outputDir, "text_summary.txt")
        : "text_summary.txt";
      let summaryContent = `抖音视频文本提取摘要\n生成时间: ${new Date().toLocaleString()}\n\n`;

      textResults.forEach((result, index) => {
        summaryContent += `${index + 1}. ${result.videoInfo.title}\n`;
        summaryContent += `   视频ID: ${result.videoInfo.videoId}\n`;
        summaryContent += `   提取文本: ${result.extractedText}\n`;
      });

      fs.writeFileSync(summaryPath, summaryContent);
      this.logSuccess(`文本摘要已保存到: ${summaryPath}`);
    }
  }
}

// 显示使用说明
function showUsage() {
  console.log(`
🎬 抖音视频批量处理命令行工具

使用方法:
  node scripts/douyin-batch.js <链接文件> [选项]

选项:
  -m, --mode <模式>         处理模式: download, text, both (默认: both)
  -o, --output <目录>       指定输出目录
  -d, --delay <毫秒>        请求间隔延迟 (默认: 2000ms)
  -h, --help               显示此帮助信息

处理模式:
  download    仅下载视频
  text        仅提取文本 (需要API密钥)
  both        下载视频并提取文本

链接文件格式:
  每行一个抖音分享链接，支持注释行 (以 # 开头)
  
示例链接文件 (links.txt):
  # 这是注释
  https://v.douyin.com/xxx1
  https://v.douyin.com/xxx2
  https://v.douyin.com/xxx3

示例:
  # 批量下载视频
  node scripts/douyin-batch.js links.txt -m download -o ./downloads
  
  # 批量提取文本
  node scripts/douyin-batch.js links.txt -m text
  
  # 完整处理（下载+文本）
  node scripts/douyin-batch.js links.txt -m both -o ./output

环境变量:
  SPEECH_API_KEY    语音识别API密钥（文本提取功能需要）

注意:
  1. 首次使用前请运行: npm run build
  2. 建议设置适当的延迟避免请求过于频繁
  3. 大批量处理可能需要较长时间
`);
}

// 解析命令行参数
function parseArgs(args) {
  const options = {
    mode: "both",
    outputDir: null,
    delay: 2000,
  };
  let linksFile = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "-h":
      case "--help":
        showUsage();
        process.exit(0);
        break;
      case "-m":
      case "--mode":
        if (i + 1 < args.length) {
          const mode = args[i + 1];
          if (!["download", "text", "both"].includes(mode)) {
            console.error("❌ 无效的模式，请选择: download, text, both");
            process.exit(1);
          }
          options.mode = mode;
          i++;
        } else {
          console.error("❌ -m/--mode 选项需要指定模式");
          process.exit(1);
        }
        break;
      case "-o":
      case "--output":
        if (i + 1 < args.length) {
          options.outputDir = args[i + 1];
          i++;
        } else {
          console.error("❌ -o/--output 选项需要指定目录");
          process.exit(1);
        }
        break;
      case "-d":
      case "--delay":
        if (i + 1 < args.length) {
          options.delay = parseInt(args[i + 1], 10);
          if (isNaN(options.delay) || options.delay < 0) {
            console.error("❌ 延迟时间必须是非负整数");
            process.exit(1);
          }
          i++;
        } else {
          console.error("❌ -d/--delay 选项需要指定延迟时间");
          process.exit(1);
        }
        break;
      default:
        if (!linksFile && !arg.startsWith("-")) {
          linksFile = arg;
        }
        break;
    }
  }

  return { linksFile, options };
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showUsage();
    process.exit(1);
  }

  const { linksFile, options } = parseArgs(args);

  if (!linksFile) {
    console.error("❌ 请指定链接文件");
    showUsage();
    process.exit(1);
  }

  if (!fs.existsSync(linksFile)) {
    console.error(`❌ 链接文件不存在: ${linksFile}`);
    process.exit(1);
  }

  const processor = new DouyinBatchProcessor();

  try {
    await processor.batchProcess(linksFile, options);
    console.log("\n🎉 批量处理完成！");
  } catch (error) {
    console.error(`\n💥 批量处理失败: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ 程序执行失败:", error.message);
    process.exit(1);
  });
}

module.exports = { DouyinBatchProcessor };
