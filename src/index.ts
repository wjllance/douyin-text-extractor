export { DouyinService } from "./services/DouyinService";
export { FileUtils } from "./utils/fileUtils";
export * from "./types";

// Re-export logger for users who want to configure logging
export { default as logger } from "./utils/logger";

// Default export for convenience
import { DouyinService } from "./services/DouyinService";
export default DouyinService;
