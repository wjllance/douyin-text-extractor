# 命令行工具使用指南

本项目提供了完整的命令行工具，支持单个和批量处理抖音视频。

## 🛠️ 工具概览

| 工具               | 功能     | 用途                 |
| ------------------ | -------- | -------------------- |
| `douyin.js`        | 主入口   | 统一的命令行界面     |
| `douyin-to-text.js`| 转文本   | 提取视频中的语音文本 |
| `douyin-download.js` | 下载   | 下载无水印视频       |
| `douyin-batch.js`  | 批量处理 | 批量下载或转文本     |

## 🚀 快速开始

### 环境准备

```bash
# 1. 安装依赖
npm install

# 2. 编译代码
npm run build

# 3. 设置API密钥（文本提取需要）
export SPEECH_API_KEY="your-siliconflow-api-key"

# 4. 检查环境
node scripts/douyin.js status
```

### 基本使用

```bash
# 查看帮助
node scripts/douyin.js

# 下载视频
node scripts/douyin.js download "https://v.douyin.com/xxx"

# 提取文本
node scripts/douyin.js to-text "https://v.douyin.com/xxx"

# 批量处理
node scripts/douyin.js batch example-links.txt
```

## 📝 详细功能

### 1. 主工具 (douyin.js)

统一的命令行入口。

```bash
# 语法
node scripts/douyin.js <命令> [参数]

# 可用命令
to-text     # 视频转文本
download    # 视频下载
batch       # 批量处理
help        # 帮助信息
status      # 环境检查
```

**示例：**
```bash
# 环境检查
node scripts/douyin.js status

# 命令帮助
node scripts/douyin.js help download
```

### 2. 视频转文本 (douyin-to-text.js)

将抖音视频语音转换为文本。

```bash
# 语法
node scripts/douyin-to-text.js <抖音链接> [选项]

# 选项
-o, --output <文件>    保存到文件 (.txt 或 .json)
-h, --help            显示帮助
```

**示例：**
```bash
# 基础转文本
node scripts/douyin-to-text.js "https://v.douyin.com/xxx"

# 保存为文本文件
node scripts/douyin-to-text.js "https://v.douyin.com/xxx" -o result.txt

# 保存为JSON文件
node scripts/douyin-to-text.js "https://v.douyin.com/xxx" -o result.json
```

### 3. 视频下载 (douyin-download.js)

下载抖音无水印视频。

```bash
# 语法
node scripts/douyin-download.js <抖音链接> [选项]

# 选项
-o, --output <路径>    指定输出文件或目录
-l, --link-only       仅获取下载链接，不下载
-h, --help           显示帮助
```

**示例：**
```bash
# 下载到当前目录
node scripts/douyin-download.js "https://v.douyin.com/xxx"

# 指定文件名
node scripts/douyin-download.js "https://v.douyin.com/xxx" -o "my_video.mp4"

# 指定目录
node scripts/douyin-download.js "https://v.douyin.com/xxx" -o "./downloads/"

# 仅获取下载链接
node scripts/douyin-download.js "https://v.douyin.com/xxx" --link-only
```

### 4. 批量处理 (douyin-batch.js)

批量处理多个抖音视频。

```bash
# 语法
node scripts/douyin-batch.js <链接文件> [选项]

# 选项
-m, --mode <模式>     处理模式: download, text, both (默认: both)
-o, --output <目录>   指定输出目录
-d, --delay <毫秒>    请求间隔延迟 (默认: 2000ms)
-h, --help           显示帮助
```

**处理模式：**
- `download`: 仅下载视频
- `text`: 仅提取文本（需要 API 密钥）
- `both`: 下载视频并提取文本

**链接文件格式：**
```
# 这是注释行
https://v.douyin.com/video1
https://v.douyin.com/video2
https://v.douyin.com/video3
```

**示例：**
```bash
# 批量下载
node scripts/douyin-batch.js links.txt -m download -o ./downloads

# 批量提取文本
node scripts/douyin-batch.js links.txt -m text

# 完整批量处理
node scripts/douyin-batch.js links.txt -m both -o ./output

# 设置请求延迟
node scripts/douyin-batch.js links.txt -d 3000
```

## 🎯 使用场景

### 场景 1: 单个视频处理

```bash
# 快速下载
node scripts/douyin.js download "https://v.douyin.com/xxx"

# 提取文本并保存
node scripts/douyin.js to-text "https://v.douyin.com/xxx" -o transcription.txt
```

### 场景 2: 批量内容分析

```bash
# 1. 准备链接文件
echo "https://v.douyin.com/video1" > analysis_list.txt
echo "https://v.douyin.com/video2" >> analysis_list.txt

# 2. 批量提取文本
node scripts/douyin-batch.js analysis_list.txt -m text -o ./results

# 3. 查看结果
ls ./results/
```

### 场景 3: 内容备份

```bash
# 批量下载视频并保存文本
node scripts/douyin-batch.js backup_list.txt -m both -o ./backup -d 3000
```

### 场景 4: 快速预览

```bash
# 仅获取下载链接，不实际下载
node scripts/douyin-download.js "https://v.douyin.com/xxx" --link-only
```

## ⚙️ 配置与优化

### 环境变量

```bash
# 必需配置
export SPEECH_API_KEY="your-api-key"

# 可选配置
export SPEECH_API_BASE_URL="https://api.siliconflow.cn/v1/audio/transcriptions"
export SPEECH_MODEL="FunAudioLLM/SenseVoiceSmall"
export TEMP_DIR="./temp"
export DOWNLOAD_DIR="./downloads"
export LOG_LEVEL="info"
```

### 性能优化

```bash
# 设置合适的请求延迟（避免被限制）
node scripts/douyin-batch.js links.txt -d 3000

# 分批处理大量链接
split -l 10 large_links.txt batch_
for file in batch_*; do
  node scripts/douyin-batch.js "$file" -o "./output_$file"
  sleep 30  # 批次间休息
done
```

## 🐛 故障排除

### 常见错误

1. **FFmpeg 未找到**
   ```
   Error: Cannot find ffmpeg
   ```
   **解决**: 确保 FFmpeg 已安装并在 PATH 中

2. **API 密钥错误**
   ```
   未设置语音识别API密钥
   ```
   **解决**: 检查 `SPEECH_API_KEY` 环境变量

3. **文件权限错误**
   ```
   ENOENT: no such file or directory
   ```
   **解决**: 确保有写入权限，创建必要目录

4. **网络错误**
   ```
   Request failed with status code 403
   ```
   **解决**: 检查网络连接，适当增加延迟

### 调试技巧

```bash
# 开启详细日志
export LOG_LEVEL="debug"

# 测试单个链接
node scripts/douyin-to-text.js "test-link" -o debug.json

# 检查环境状态
node scripts/douyin.js status
```

## 📊 输出格式

### 文本文件输出

```
视频信息:
- 标题: 抖音视频标题
- ID: 7372484719365098803
- 描述: 视频描述信息

提取文本:
这里是从视频中提取的语音文本内容...
```

### JSON 文件输出

```json
{
  "videoInfo": {
    "videoId": "7372484719365098803",
    "title": "抖音视频标题",
    "downloadUrl": "https://...",
    "desc": "视频描述信息"
  },
  "extractedText": "提取的语音文本内容...",
  "processingTime": 25000
}
```

### 批量处理输出

```
批量处理结果:
✅ 成功: 8个视频
❌ 失败: 2个视频

详细结果保存至: ./results/batch_report.json
```

## 💡 最佳实践

1. **设置合理延迟**: 批量处理时使用 2-5 秒延迟
2. **分批处理**: 大量链接分批处理，避免长时间运行
3. **检查结果**: 定期检查输出文件，确保处理质量
4. **备份重要数据**: 重要内容建议多重备份
5. **监控资源**: 注意磁盘空间和网络流量

## 🔗 相关文档

- [快速开始指南](./QUICKSTART.md)
- [开发指南](./DEVELOPMENT.md)
- [API 文档](../README.md) 