# Development Guide for Custom Exporters

This guide will help you set up a local development environment for testing your custom Supernova exporters.

## Quick Start

### 1. Set up your custom exporter

```bash
# Copy an existing exporter as a starting point
cp -r exporters/style-dictionary exporters/my-custom-exporter

# Navigate to your exporter
cd exporters/my-custom-exporter

# Install dependencies
npm install
```

### 2. Build and test your exporter

```bash
# Build the exporter
npm run build

# Test locally with mock data
npm test
```

## Development Workflow

### Available Scripts

- `npm run dev` - Starts webpack in watch mode for development
- `npm run build` - Builds the production version
- `npm test` - Runs the local test with mock data

### File Structure

Your exporter should follow this structure:
```
my-custom-exporter/
├── src/
│   ├── index.ts          # Main exporter logic
│   ├── config.ts         # Configuration interface
│   ├── content/          # Token processing logic
│   ├── files/            # File generation logic
│   └── utils/            # Utility functions
├── dist/
│   └── build.js          # Built exporter (generated)
├── package.json
├── webpack.config.js
├── tsconfig.json
├── exporter.json         # Exporter metadata
└── test-runner.js        # Local test script
```

## Testing Your Exporter

### Option 1: Local Testing (Recommended for Development)

The `test-runner.js` script provides a way to test your exporter with mock data:

```bash
npm test
```

This will:
1. Load your built exporter
2. Run it with mock tokens and configuration
3. Display the generated files and their content

### Option 2: Supernova Web Interface

1. Build your exporter: `npm run build`
2. The built exporter will be in `dist/build.js`
3. Upload this file to Supernova's web interface for testing

### Option 3: Integration Testing

You can also test your exporter by:
1. Publishing it to a private npm registry
2. Installing it in a Supernova project
3. Running exports through the Supernova interface

## Mock Data

The test runner uses mock data that simulates real Supernova tokens:

```javascript
const mockTokens = [
  {
    id: 'color-primary',
    name: 'Primary',
    type: 'color',
    value: '#007AFF',
    description: 'Primary brand color',
    brandId: null,
    groupId: 'colors'
  }
  // ... more tokens
];
```

You can modify the mock data in `test-runner.js` to test different scenarios.

## Configuration

Your exporter's configuration is defined in `src/config.ts`. The test runner uses default configuration values, but you can modify them in the `Pulsar.exportConfig()` mock.

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Run `npm install` to install dependencies
   - Make sure the utils package is properly linked

2. **"Export function not found"**
   - Run `npm run build` to build the exporter
   - Check that `dist/build.js` exists

3. **TypeScript compilation errors**
   - Check your TypeScript configuration in `tsconfig.json`
   - Make sure all imports are correct

### Debug Tips

1. Add console.log statements in your exporter code
2. Use the webpack dev mode for faster rebuilds: `npm run dev`
3. Check the generated `dist/build.js` file for any build issues

## Next Steps

1. **Customize your exporter**: Modify the source code in `src/` directory
2. **Update configuration**: Modify `src/config.ts` to add new options
3. **Test thoroughly**: Use the test runner to validate your changes
4. **Deploy**: Build and upload your exporter to Supernova

## Resources

- [Supernova Developer Documentation](https://developers.supernova.io)
- [Building Exporters Video](https://www.youtube.com/watch?v=4BvoWLPbOMo)
- [Supernova Community](https://community.supernova.io) 