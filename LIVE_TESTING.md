# Testing Your Exporter with Live Supernova Data

This guide will help you test your custom exporter against real Supernova token data.

## Prerequisites

1. **Supernova Account**: You need access to a Supernova project with design tokens
2. **API Key**: Get your API key from Supernova account settings
3. **Design System ID**: Found in your Supernova project URL
4. **Version ID**: Found in your Supernova project URL

## Setup

### 1. Install Dependencies

```bash
cd exporters/your-custom-exporter
npm install
```

### 2. Create Environment File

Create a `.env` file in your exporter directory:

```bash
# Supernova API Credentials
SUPERNOVA_API_KEY=your_api_key_here

# Design System Information
SUPERNOVA_DS_ID=your_design_system_id
SUPERNOVA_VERSION_ID=your_version_id

# Optional: Brand ID (if you want to test with a specific brand)
SUPERNOVA_BRAND_ID=your_brand_id
```

### 3. Build Your Exporter

```bash
npm run build
```

## Testing Methods

### Method 1: CLI Tool (Recommended)

Run the live testing tool:

```bash
npm run test:live
```

This will:
1. Connect to your Supernova instance
2. Fetch real token data
3. Run your exporter
4. Show the generated files
5. Optionally save files locally

### Method 2: Supernova Web Interface

1. Build your exporter: `npm run build`
2. Go to your Supernova project
3. Navigate to Exporters section
4. Upload your `dist/build.js` file
5. Configure and run the export

### Method 3: Programmatic Testing

You can also create your own test script:

```javascript
const { Supernova } = require('@supernovaio/sdk-exporters');

// Initialize SDK
const sdk = new Supernova('your_api_key');

// Load your exporter
require('./dist/build.js');

// Create context
const context = {
  dsId: 'your_ds_id',
  versionId: 'your_version_id',
  brandId: null
};

// Run export
const result = await global.testExportFunction(sdk, context);
console.log(result);
```

## Getting Your Supernova Credentials

### API Key
1. Go to your Supernova account settings
2. Navigate to API section
3. Generate a new API key

### Design System and Version IDs
1. Open your Supernova project
2. Look at the URL: `https://app.supernova.io/design-systems/{DS_ID}/versions/{VERSION_ID}`
3. Copy the IDs from the URL

### Brand ID (Optional)
1. In your Supernova project, go to Brands section
2. Select a brand to get its ID
3. Or leave empty to test with all brands

## Troubleshooting

### Authentication Issues
- Check your API key is correct
- Make sure your API key has the necessary permissions
- Verify your Supernova account is active

### Design System Not Found
- Check your Design System ID is correct
- Make sure you have access to the design system
- Verify the design system exists

### Export Function Not Found
- Run `npm run build` to build your exporter
- Check that `dist/build.js` exists
- Verify your exporter code is correct

### Network Issues
- Check your internet connection
- Verify Supernova services are available
- Try again in a few minutes

## Example Output

When testing successfully, you should see output like:

```
🚀 Supernova Live Exporter Test

📡 Connecting to Supernova...
✅ Connected to: My Design System
📦 Loading exporter...
🔄 Running export with live data...

📁 Generated files:
==================

1. colors/colors.json
   Type: text
   Content preview:
   {
     "_comment": "This file was generated automatically by Supernova.io...",
     "color": {
       "primary": {
         "value": "#007AFF"
       }
     }
   }

✅ Export completed! Generated 3 files.

Save files locally? (y/n): y
💾 Saved: ./test-output/colors/colors.json
💾 Saved: ./test-output/spacing/spacing.json
💾 Saved: ./test-output/typography/typography.json

📁 Files saved to: ./test-output/
```

## Next Steps

1. **Review the output**: Check if the generated files match your expectations
2. **Iterate**: Make changes to your exporter and test again
3. **Deploy**: Once satisfied, upload your exporter to Supernova for production use

## Security Notes

- Never commit your `.env` file to version control
- Keep your API key secure
- Use environment variables in production
- Consider using a test design system for development 