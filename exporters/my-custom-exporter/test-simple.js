#!/usr/bin/env node

// Simple test to show exporter output format
console.log('🚀 Simple Exporter Test\n');

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

// Mock tokens that represent your Firefly design system
const mockTokens = [
  {
    id: 'color-primary',
    name: 'Primary',
    tokenType: 'color',
    value: '#007AFF',
    description: 'Primary brand color',
    brandId: null,
    groupId: 'colors',
    tokenPath: ['colors', 'primary']
  },
  {
    id: 'color-secondary',
    name: 'Secondary', 
    tokenType: 'color',
    value: '#5856D6',
    description: 'Secondary brand color',
    brandId: null,
    groupId: 'colors',
    tokenPath: ['colors', 'secondary']
  },
  {
    id: 'spacing-small',
    name: 'Small',
    tokenType: 'spacing',
    value: '8px',
    description: 'Small spacing unit',
    brandId: null,
    groupId: 'spacing',
    tokenPath: ['spacing', 'small']
  },
  {
    id: 'spacing-medium',
    name: 'Medium',
    tokenType: 'spacing', 
    value: '16px',
    description: 'Medium spacing unit',
    brandId: null,
    groupId: 'spacing',
    tokenPath: ['spacing', 'medium']
  },
  {
    id: 'typography-heading',
    name: 'Heading',
    tokenType: 'typography',
    value: 'font-size: 24px; font-weight: bold;',
    description: 'Heading typography',
    brandId: null,
    groupId: 'typography',
    tokenPath: ['typography', 'heading']
  }
];

const mockTokenGroups = [
  {
    id: 'colors',
    name: 'Colors',
    description: 'Color tokens'
  },
  {
    id: 'spacing',
    name: 'Spacing',
    description: 'Spacing tokens'
  },
  {
    id: 'typography',
    name: 'Typography',
    description: 'Typography tokens'
  }
];

// Mock the Supernova SDK
const mockSdk = {
  tokens: {
    getTokens: async () => mockTokens,
    getTokenGroups: async () => mockTokenGroups,
    getTokenCollections: async () => []
  },
  brands: {
    getBrands: async () => []
  }
};

// Mock the Pulsar context
const mockContext = {
  dsId: '352464',
  versionId: '424898',
  brandId: null
};

async function runSimpleTest() {
  try {
    console.log('📦 Loading exporter...');
    require('./dist/build.js');
    
    if (!global.testExportFunction) {
      throw new Error('Export function not found. Make sure to run "npm run build" first.');
    }
    
    console.log('🔄 Running export with mock data...\n');
    
    // Run the export function
    const result = await global.testExportFunction(mockSdk, mockContext);
    
    console.log('📁 Generated files:');
    console.log('==================\n');
    
    result.forEach((file, index) => {
      console.log(`${index + 1}. ${file.path}/${file.name}`);
      console.log(`   Type: ${file.type}`);
      
      if (file.type === 'text' && file.content) {
        console.log(`   Content preview:`);
        const preview = file.content.substring(0, 400);
        console.log('   ' + preview + (file.content.length > 400 ? '...' : ''));
      }
      
      console.log('');
    });
    
    console.log(`✅ Test completed! Generated ${result.length} files.`);
    
    // Save files locally
    const fs = require('fs');
    const outputDir = './test-output';
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    result.forEach((file) => {
      if (file.type === 'text') {
        const filePath = require('path').join(outputDir, file.path, file.name);
        const dir = require('path').dirname(filePath);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, file.content);
        console.log(`💾 Saved: ${filePath}`);
      }
    });
    
    console.log(`\n📁 Files saved to: ${outputDir}/`);
    console.log('\n🎯 This shows you the output format your exporter generates!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure to run "npm run build" first');
  }
}

// Run the test
runSimpleTest(); 