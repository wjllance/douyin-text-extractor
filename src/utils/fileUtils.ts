import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export class FileUtils {
  /**
   * 确保目录存在，如果不存在则创建
   */
  static ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 生成安全的文件名
   */
  static sanitizeFilename(filename: string): string {
    return filename.replace(/[\\/:*?"<>|]/g, "_");
  }

  /**
   * 生成唯一的临时文件路径
   */
  static generateTempFilePath(originalName: string, extension: string): string {
    const tempDir = path.join(process.cwd(), "temp");
    this.ensureDir(tempDir);

    const uuid = uuidv4();
    const safeName = this.sanitizeFilename(originalName);
    return path.join(tempDir, `${uuid}_${safeName}.${extension}`);
  }

  /**
   * 删除文件（如果存在）
   */
  static deleteFile(filePath: string): { success: boolean; error?: string } {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true };
      }
      return { success: false, error: "File does not exist" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Error deleting file ${filePath}:`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 删除多个文件
   */
  static deleteFiles(filePaths: string[]): {
    deletedFiles: string[];
    errors: string[];
  } {
    const deletedFiles: string[] = [];
    const errors: string[] = [];

    filePaths.forEach((filePath) => {
      const result = this.deleteFile(filePath);
      if (result.success) {
        deletedFiles.push(filePath);
      } else {
        errors.push(`${filePath}: ${result.error}`);
      }
    });

    return { deletedFiles, errors };
  }

  /**
   * 清理临时目录中的旧文件（超过指定时间的文件）
   */
  static cleanupTempFiles(maxAgeMinutes: number = 60): void {
    try {
      const tempDir = path.join(process.cwd(), "temp");
      if (!fs.existsSync(tempDir)) return;

      const files = fs.readdirSync(tempDir);
      const now = Date.now();
      const maxAge = maxAgeMinutes * 60 * 1000; // 转换为毫秒

      files.forEach((file) => {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          this.deleteFile(filePath);
        }
      });
    } catch (error) {
      console.error("Error cleaning up temp files:", error);
    }
  }

  /**
   * 获取文件大小（字节）
   */
  static getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }
}
