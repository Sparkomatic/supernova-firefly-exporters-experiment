#!/usr/bin/env node

const readline = require('readline');
const path = require('path');

// You'll need to install these packages:
// npm install @supernovaio/sdk-exporters dotenv

// Mock the Pulsar global for the exporter
global.Pulsar = {
  export: (fn) => {
    global.testExportFunction = fn;
  },
  exportConfig: () => ({
    showDescriptions: true,
    useReferences: true,
    tokenNameStyle: 'camelCase',
    colorFormat: 'hex',
    indent: 2,
    fileStructure: 'separateByType',
    showGeneratedFileDisclaimer: true,
    disclaimer: 'This file was generated automatically by Supernova.io and should not be changed manually.'
  })
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function testWithLiveData() {
  console.log('🚀 Supernova Live Exporter Test\n');
  
  try {
    // Load environment variables if .env file exists
    try {
      require('dotenv').config();
    } catch (e) {
      console.log('No .env file found, you can create one with your Supernova credentials');
    }
    
    // Get Supernova credentials
    const apiKey = process.env.SUPERNOVA_API_KEY || await prompt('Enter your Supernova API key: ');
    const designSystemId = process.env.SUPERNOVA_DS_ID || await prompt('Enter your Design System ID: ');
    const versionId = process.env.SUPERNOVA_VERSION_ID || await prompt('Enter your Version ID: ');
    const brandId = process.env.SUPERNOVA_BRAND_ID || await prompt('Enter Brand ID (optional, press Enter to skip): ');
    
    if (!apiKey || !designSystemId || !versionId) {
      throw new Error('Missing required credentials');
    }
    
    console.log('\n📡 Connecting to Supernova...');
    
    // Import the Supernova SDK and try different approaches
    const sdkModule = require('@supernovaio/sdk-exporters');
    console.log('SDK module type:', typeof sdkModule);
    console.log('Available keys:', Object.keys(sdkModule).slice(0, 10)); // Show first 10 keys
    
    // Try to find the actual SDK constructor
    let sdk;
    if (sdkModule.Supernova && typeof sdkModule.Supernova === 'function') {
      console.log('Found Supernova constructor');
      sdk = new sdkModule.Supernova(apiKey);
    } else if (sdkModule.default && typeof sdkModule.default === 'function') {
      console.log('Found default export as constructor');
      sdk = new sdkModule.default(apiKey);
    } else if (sdkModule.createSupernova && typeof sdkModule.createSupernova === 'function') {
      console.log('Found createSupernova factory');
      sdk = sdkModule.createSupernova(apiKey);
    } else {
      console.log('No constructor found, trying direct usage');
      sdk = sdkModule;
    }
    
    console.log('SDK instance:', typeof sdk, sdk ? Object.keys(sdk).slice(0, 5) : 'null');
    
    // Test the connection
    const designSystem = await sdk.designSystems.getDesignSystem(designSystemId);
    console.log(`✅ Connected to: ${designSystem.name}`);
    
    // Load the exporter
    console.log('📦 Loading exporter...');
    require('./dist/build.js');
    
    if (!global.testExportFunction) {
      throw new Error('Export function not found. Make sure to run "npm run build" first.');
    }
    
    // Create the context
    const context = {
      dsId: designSystemId,
      versionId: versionId,
      brandId: brandId || null
    };
    
    console.log('🔄 Running export with live data...\n');
    
    // Run the export
    const result = await global.testExportFunction(sdk, context);
    
    console.log('📁 Generated files:');
    console.log('==================\n');
    
    result.forEach((file, index) => {
      console.log(`${index + 1}. ${file.path}/${file.name}`);
      console.log(`   Type: ${file.type}`);
      
      if (file.type === 'text' && file.content) {
        console.log(`   Content preview:`);
        const preview = file.content.substring(0, 300);
        console.log('   ' + preview + (file.content.length > 300 ? '...' : ''));
      }
      
      console.log('');
    });
    
    console.log(`✅ Export completed! Generated ${result.length} files.`);
    
    // Option to save files locally
    const saveLocally = await prompt('\nSave files locally? (y/n): ');
    if (saveLocally.toLowerCase() === 'y') {
      const fs = require('fs');
      const outputDir = './test-output';
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      result.forEach((file) => {
        if (file.type === 'text') {
          const filePath = path.join(outputDir, file.path, file.name);
          const dir = path.dirname(filePath);
          
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(filePath, file.content);
          console.log(`💾 Saved: ${filePath}`);
        }
      });
      
      console.log(`\n📁 Files saved to: ${outputDir}/`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n💡 Authentication failed. Check your API key.');
    } else if (error.message.includes('404')) {
      console.log('\n💡 Design system or version not found. Check your IDs.');
    } else {
      console.log('\n💡 Make sure to:');
      console.log('   1. Run "npm install" to install dependencies');
      console.log('   2. Run "npm run build" to build the exporter');
      console.log('   3. Check your Supernova credentials');
    }
  } finally {
    rl.close();
  }
}

// Run the test
testWithLiveData(); 