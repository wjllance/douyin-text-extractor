# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-05-29

### Changed

- **BREAKING**: Refactored `DouyinService` class to remove dependency on config file
- Migrated all JavaScript scripts to TypeScript for better type safety
- Updated `DouyinService` constructor to use dependency injection pattern
- Removed `createWithEnvDefaults()` method for simpler API design
- Enhanced TypeScript configuration for script compilation

### Added

- Full TypeScript support for all script files
- Improved type safety across the entire codebase
- Better dependency injection pattern in core services

### Improved

- Cleaner separation of concerns in service architecture
- More flexible configuration management
- Enhanced developer experience with TypeScript

### Scripts Migrated

- `scripts/douyin-download.js` → `scripts/douyin-download.ts`
- `scripts/douyin-to-text.js` → `scripts/douyin-to-text.ts` 
- `scripts/douyin-batch.js` → `scripts/douyin-batch.ts`
- `scripts/douyin.js` → `scripts/douyin.ts`

## [1.0.0] - 2025-05-29

### Added

- Initial release of `douyin-text-extractor`
- Complete TypeScript support with type definitions
- Core functionality for Douyin/TikTok video text extraction
- Speech recognition integration
- Video download and audio extraction
- Automatic temporary file cleanup
- Progress callbacks for all operations
- Comprehensive documentation and examples

### Features

- Parse Douyin share links
- Download watermark-free videos
- Extract audio from videos using FFmpeg
- Convert speech to text using configurable APIs
- Full TypeScript support
- CommonJS and ES modules compatibility

### Documentation

- Complete API documentation
- Quick start guide
- JavaScript and TypeScript examples
- Environment configuration guide

### Package

- Published as `douyin-text-extractor` on npm
- MIT License
- Node.js 16+ compatibility
- Minimal dependencies for core functionality
