#!/usr/bin/env node

const axios = require("axios");
const { performance } = require("perf_hooks");

// 配置
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
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

class DouyinTester {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 120000, // 2分钟超时
      headers: {
        "Content-Type": "application/json",
      },
    });
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

  logStep(step, message) {
    this.log(`\n📋 步骤 ${step}: ${message}`, "cyan");
  }

  async testHealth() {
    this.logStep(1, "测试服务健康状态");
    try {
      const response = await this.client.get("/health");
      this.logSuccess(`服务状态: ${response.data.status}`);
      this.logInfo(`版本: ${response.data.version}`);
      return true;
    } catch (error) {
      this.logError(`健康检查失败: ${error.message}`);
      return false;
    }
  }

  async testApiInfo() {
    this.logStep(2, "获取API信息");
    try {
      const response = await this.client.get("/api/info");
      this.logSuccess(`API名称: ${response.data.name}`);
      this.logInfo(`描述: ${response.data.description}`);
      this.logInfo("可用端点:");
      Object.entries(response.data.endpoints).forEach(([endpoint, desc]) => {
        console.log(`  ${endpoint}: ${desc}`);
      });
      return true;
    } catch (error) {
      this.logError(`获取API信息失败: ${error.message}`);
      return false;
    }
  }

  async testParseUrl(shareLink) {
    this.logStep(3, "解析抖音链接");
    const startTime = performance.now();

    try {
      const response = await this.client.post("/api/parse", { shareLink });
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (response.data.status === "success") {
        this.logSuccess(`链接解析成功 (${duration}ms)`);
        const { data } = response.data;
        this.logInfo(`视频ID: ${data.videoId}`);
        this.logInfo(`标题: ${data.title}`);
        this.logInfo(`描述: ${data.desc || "无描述"}`);
        this.logInfo(`下载链接: ${data.downloadUrl.substring(0, 80)}...`);
        return data;
      } else {
        this.logError(`解析失败: ${response.data.error}`);
        return null;
      }
    } catch (error) {
      this.logError(
        `解析链接时出错: ${error.response?.data?.error || error.message}`
      );
      return null;
    }
  }

  async testDownloadLink(shareLink) {
    this.logStep(4, "获取下载链接");
    const startTime = performance.now();

    try {
      const response = await this.client.post("/api/download-link", {
        shareLink,
      });
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (response.data.status === "success") {
        this.logSuccess(`获取下载链接成功 (${duration}ms)`);
        this.logInfo(`视频ID: ${response.data.videoId}`);
        this.logInfo(`标题: ${response.data.title}`);
        this.logInfo(`使用提示: ${response.data.usageTip}`);
        return response.data;
      } else {
        this.logError(`获取下载链接失败: ${response.data.error}`);
        return null;
      }
    } catch (error) {
      this.logError(
        `获取下载链接时出错: ${error.response?.data?.error || error.message}`
      );
      return null;
    }
  }

  async testExtractText(shareLink, withApiKey = true) {
    this.logStep(5, "提取视频文本");

    if (!withApiKey) {
      this.logWarning("跳过文本提取测试 (需要API密钥)");
      return null;
    }

    const startTime = performance.now();

    try {
      this.logInfo("开始文本提取流程，这可能需要一些时间...");

      const response = await this.client.post("/api/extract-text", {
        shareLink,
      });
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (response.data.status === "success") {
        this.logSuccess(`文本提取成功 (${duration}ms)`);
        this.logInfo(`处理时间: ${response.data.processingTime}ms`);
        this.logInfo(`提取的文本: "${response.data.extractedText}"`);
        return response.data;
      } else {
        this.logError(`文本提取失败: ${response.data.error}`);
        return null;
      }
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      this.logError(
        `文本提取时出错 (${duration}ms): ${
          error.response?.data?.error || error.message
        }`
      );
      return null;
    }
  }

  async runFullTest(shareLink, skipTextExtraction = false) {
    this.log("\n🚀 开始抖音视频处理功能测试", "bright");
    this.log("=".repeat(50), "cyan");

    const results = {
      health: false,
      apiInfo: false,
      parseUrl: null,
      downloadLink: null,
      extractText: null,
    };

    // 1. 健康检查
    results.health = await this.testHealth();
    if (!results.health) {
      this.logError("服务不可用，请确保服务正在运行");
      return results;
    }

    // 2. API信息
    results.apiInfo = await this.testApiInfo();

    // 3. 解析链接
    results.parseUrl = await this.testParseUrl(shareLink);

    // 4. 获取下载链接
    results.downloadLink = await this.testDownloadLink(shareLink);

    // 5. 提取文本（可选）
    if (!skipTextExtraction) {
      results.extractText = await this.testExtractText(shareLink, true);
    } else {
      this.logStep(5, "跳过文本提取测试");
      this.logWarning("要测试文本提取功能，请设置环境变量 SPEECH_API_KEY");
    }

    // 测试总结
    this.log("\n📊 测试结果总结", "bright");
    this.log("=".repeat(50), "cyan");

    const testResults = [
      ["健康检查", results.health],
      ["API信息", results.apiInfo],
      ["链接解析", results.parseUrl !== null],
      ["下载链接", results.downloadLink !== null],
      ["文本提取", results.extractText !== null || skipTextExtraction],
    ];

    testResults.forEach(([name, success]) => {
      if (success) {
        this.logSuccess(`${name}: 通过`);
      } else {
        this.logError(`${name}: 失败`);
      }
    });

    const successCount = testResults.filter(([, success]) => success).length;
    const totalCount = testResults.length;

    this.log(
      `\n🎯 测试完成: ${successCount}/${totalCount} 项通过`,
      successCount === totalCount ? "green" : "yellow"
    );

    return results;
  }
}

// 使用说明
function printUsage() {
  console.log(`
🎬 抖音视频文本提取 API 测试工具

使用方法:
  node test-script.js <抖音分享链接> [选项]

选项:
  --skip-text     跳过文本提取测试（当没有API密钥时使用）
  --api-url       指定API服务地址（默认: http://localhost:3000）
  --help          显示此帮助信息

示例:
  # 完整测试
  node test-script.js "https://v.douyin.com/xxx"
  
  # 跳过文本提取测试
  node test-script.js "https://v.douyin.com/xxx" --skip-text
  
  # 指定服务地址
  node test-script.js "https://v.douyin.com/xxx" --api-url http://192.168.1.100:3000

环境变量:
  API_BASE_URL    API服务地址
  SPEECH_API_KEY  语音识别API密钥（用于文本提取功能）
`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const shareLink = args[0];
  const skipText = args.includes("--skip-text");
  const apiUrlIndex = args.indexOf("--api-url");
  const apiUrl = apiUrlIndex > -1 ? args[apiUrlIndex + 1] : API_BASE_URL;

  if (!shareLink || !shareLink.includes("douyin.com")) {
    console.error("❌ 请提供有效的抖音分享链接");
    printUsage();
    process.exit(1);
  }

  const tester = new DouyinTester(apiUrl);

  try {
    await tester.runFullTest(shareLink, skipText);
  } catch (error) {
    console.error("❌ 测试过程中发生未预期的错误:", error.message);
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
