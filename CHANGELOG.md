# Changelog

All notable changes to ConteFi will be documented in this file.

## [2.0.0] - 2025-01-13

### Major Release

This is a major release with a completely redesigned UI, improved architecture, and many new features for managing Contentful translations in Figma.

### New Features

#### Write Mode (Primary Feature)
- **Two-way sync**: Read translations from Contentful and push changes back
- **Grouped items view**: Text nodes are grouped by key name for easier management
- **Status badges**: Visual indicators showing New, Changed, or Synced status for each key
- **Conflict resolution**: Modal-based conflict resolution when Figma and Contentful values differ
- **Bulk operations**: Update multiple text nodes with the same key simultaneously

#### User Interface
- **Redesigned settings page**: Modal-based validation with step-by-step preflight checks
- **Search functionality**: Filter keys by name or text content with debounced search
- **Filter toggle**: Quickly filter to show only new or changed items
- **Window resize toggle**: Switch between normal and compact view modes
- **Tooltip system**: Helpful tooltips throughout the interface
- **Key statistics display**: Shows total keys, new items, and changed items at a glance
- **Plugin version display**: Version number shown in settings page

#### Performance & Reliability
- **Optimized Figma & Contentful key fetching**: Faster data loading with pagination support
- **Auto-filter on text node selection**: Clicking a text node in Figma auto-filters the list
- **Improved user feedback**: Better loading states and error messages when uploading keys
- **Selection tracking**: Real-time updates when selecting text nodes in the canvas

#### Developer Experience
- **Modular architecture**: Refactored codebase into services (config, contentful, network, node)
- **Comprehensive test suite**: Unit tests for all services with 89+ tests
- **UI behavior tests**: Dedicated test suite for UI interactions
- **Improved build system**: Separate dev and production builds with esbuild
- **ESLint integration**: Code quality checks with Figma plugin rules

### Bug Fixes

- **Fixed first-time settings save hang**: Auto-load data when navigating to write view after saving settings for the first time
- **Fixed loading overlay stuck state**: Properly hide loading overlay when no translatable nodes are found
- **Fixed invalid node selection filtering**: Ignore non-matching text node selections
- **Fixed conflict modal error handling**: Better error states in conflict resolution
- **Fixed hardcoded colors**: Proper theme support for light and dark modes
- **Fixed table text display issues**: Correct truncation and overflow handling
- **Fixed tooltip positioning**: Tooltips now appear correctly near their targets

### UI/UX Improvements

- **8-step color system**: Consistent color palette with CSS variables
- **SVG icons**: Replaced Unicode emojis with crisp SVG icons
- **Button standardization**: Consistent button styles throughout the app
- **Standardized padding**: Uniform spacing across all components
- **Status badge redesign**: Clearer visual hierarchy for status indicators
- **Truncated key tooltips**: Full key names shown on hover for long keys
- **Table layout improvements**: Better column widths and responsive design
- **Settings field validation**: Real-time validation feedback for configuration fields
- **Reset confirmation modal**: Prevents accidental configuration resets

### Technical Changes

- **Node pattern matching**: Configurable regex pattern for identifying translatable text nodes
- **API timeout handling**: 10-second timeout on all Contentful API calls with proper error messages
- **Font loading**: Handles mixed fonts in text nodes when applying translations
- **Selection debouncing**: 300ms debounce on selection change events to prevent rapid-fire updates

### Breaking Changes

- Plugin ID changed for development builds to avoid conflicts with production
- Configuration storage key remains `translatorwiz_config` for backward compatibility

---

## [1.0.0] - Initial Release

- Basic translation application from Contentful to Figma
- Simple configuration interface
- Single locale support
