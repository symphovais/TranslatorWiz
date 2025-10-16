# Settings Configuration Guide

## 📝 Overview

ContentFi now includes a **Settings Screen** where you can configure your Contentful connection using JSON. This makes the plugin flexible and reusable across different projects and Contentful setups.

---

## 🎛️ How to Access Settings

1. **Open the plugin** in Figma
2. **Click the ⚙️ gear icon** in the top-right corner
3. You'll see the **Settings Screen** with a JSON editor

---

## 📋 Configuration JSON Format

```json
{
  "SPACE_ID": "your_space_id",
  "ENVIRONMENT": "master",
  "PREVIEW_TOKEN": "your_preview_token",
  "CONTENT_TYPE": "translation",
  "KEY_FIELD": "key",
  "VALUE_FIELD": "value",
  "NODE_NAME_PATTERN": "^jams_"
}
```

### Field Descriptions:

| Field | Description | Example |
|-------|-------------|---------|
| **SPACE_ID** | Your Contentful space ID | `"4fejn84m8z5w"` |
| **ENVIRONMENT** | Contentful environment name | `"master"` or `"staging"` |
| **PREVIEW_TOKEN** | Contentful Preview API token | `"8R6kV7ol..."` |
| **CONTENT_TYPE** | Content type ID in Contentful | `"translation"` |
| **KEY_FIELD** | Field name for translation key | `"key"` or `"translationKey"` |
| **VALUE_FIELD** | Field name for translation value | `"value"` or `"text"` |
| **NODE_NAME_PATTERN** | Regex to match text node names | `"^jams_"` matches nodes starting with "jams_" |

---

## 🔧 Using the Settings Screen

### 1. **Edit Configuration**
- Paste your JSON config into the textarea
- Make sure it's valid JSON (check brackets, commas, quotes)

### 2. **Test Connection**
- Click **"Test Connection"** to validate config
- Plugin will attempt to fetch locales from Contentful
- Success: Shows how many locales were found ✅
- Failure: Shows specific error message ❌

### 3. **Save Configuration**
- Click **"Save Config"** to persist settings
- Config is stored in Figma's `clientStorage`
- Automatically reloads the translator with new settings
- Returns to main screen after successful save

### 4. **Reset to Default**
- Click **"Reset to Default"** to restore original config
- Useful if you make a mistake

---

## ✅ Validation & Error Handling

The plugin validates your config for:

### Required Fields:
- ❌ Empty or missing `SPACE_ID`
- ❌ Empty or missing `ENVIRONMENT`
- ❌ Empty or missing `PREVIEW_TOKEN`
- ❌ Invalid `NODE_NAME_PATTERN` regex

### API Connection:
- ❌ Invalid credentials (401/403)
- ❌ Space/environment not found (404)
- ❌ Network timeout (10 seconds)
- ❌ Invalid content type

### JSON Syntax:
- ❌ Invalid JSON format
- ❌ Missing brackets/commas
- ❌ Incorrect quotes

---

## 💾 Persistence

- **Config is saved** to Figma's `clientStorage`
- **Persists between sessions** - no need to reconfigure
- **Per-user** - each team member can have their own config
- **Safe** - tokens are stored locally, not in the Figma file

---

## 🔐 Security Best Practices

1. **Use Preview Tokens** - Don't use Management API tokens
2. **Limit Permissions** - Only give read access to the token
3. **Environment-Specific** - Use different tokens for dev/staging/prod
4. **Rotate Tokens** - Change tokens periodically in Contentful

---

## 🚀 Workflow Examples

### Example 1: Switch Between Projects
```
1. Open Settings (⚙️)
2. Paste new project's config JSON
3. Test Connection
4. Save Config
5. Plugin auto-reloads with new settings
```

### Example 2: Change Content Type
```
1. Update CONTENT_TYPE field (e.g., "translations" → "i18n")
2. Update KEY_FIELD if different (e.g., "key" → "locale_key")
3. Update VALUE_FIELD if needed (e.g., "value" → "translated_text")
4. Test & Save
```

### Example 3: Use Different Node Pattern
```
1. Update NODE_NAME_PATTERN (e.g., "^jams_" → "^i18n_")
2. Test connection (validates regex)
3. Save - plugin will now only translate nodes matching new pattern
```

---

## 🛠️ Troubleshooting

### "Invalid JSON" Error
- Check for missing commas between fields
- Ensure all strings use double quotes `"`
- Validate JSON at [jsonlint.com](https://jsonlint.com)

### "Invalid API credentials"
- Verify PREVIEW_TOKEN in Contentful Settings → API Keys
- Make sure token has access to the space
- Check if token is for Preview API (not Delivery API)

### "Content type not found"
- Verify CONTENT_TYPE matches exactly in Contentful
- Check if content type exists in the environment
- Case-sensitive - must match exactly

### "Invalid regex pattern"
- Test regex at [regex101.com](https://regex101.com)
- Common patterns:
  - `^prefix_` - starts with "prefix_"
  - `_suffix$` - ends with "_suffix"
  - `.*keyword.*` - contains "keyword"

---

## 📊 Feature Summary

✅ **Visual JSON Editor** - No code editor needed  
✅ **Live Validation** - Instant error feedback  
✅ **Test Connection** - Verify before saving  
✅ **Persistent Storage** - Config saved locally  
✅ **Reset to Default** - Easy recovery  
✅ **Auto-Reload** - Seamless config switching  
✅ **Security** - Client-side storage only  

---

## 🎯 Demo Tips

1. **Show flexibility**: Switch configs to demo different projects
2. **Test validation**: Show error handling with invalid JSON
3. **Test connection**: Demonstrate API verification
4. **Show persistence**: Close/reopen plugin to show config retained

---

**Status**: Settings feature complete and production-ready! 🚀


