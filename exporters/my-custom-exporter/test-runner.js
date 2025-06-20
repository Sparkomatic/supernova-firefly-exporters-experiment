const path = require('path');

// Mock the Pulsar context and SDK for local testing
const mockTokens = [
  {
    id: 'color-primary',
    name: 'Primary',
    type: 'color',
    value: '#007AFF',
    description: 'Primary brand color',
    brandId: null,
    groupId: 'colors'
  },
  {
    id: 'color-secondary',
    name: 'Secondary', 
    type: 'color',
    value: '#5856D6',
    description: 'Secondary brand color',
    brandId: null,
    groupId: 'colors'
  },
  {
    id: 'spacing-small',
    name: 'Small',
    type: 'spacing',
    value: '8px',
    description: 'Small spacing unit',
    brandId: null,
    groupId: 'spacing'
  },
  {
    id: 'spacing-medium',
    name: 'Medium',
    type: 'spacing', 
    value: '16px',
    description: 'Medium spacing unit',
    brandId: null,
    groupId: 'spacing'
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
  }
];

// Mock the Supernova SDK
const mockSdk = {
  tokens: {
    getTokens: async () => mockTokens,
    getTokenGroups: async () => mockTokenGroups
  },
  brands: {
    getBrands: async () => []
  }
};

// Mock the Pulsar context
const mockContext = {
  dsId: 'test-design-system',
  versionId: 'test-version',
  brandId: null
};

// Mock the Pulsar global
global.Pulsar = {
  export: (fn) => {
    // Store the export function for testing
    global.testExportFunction = fn;
  },
  exportConfig: () => ({
    // Add your default configuration here
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

async function runTest() {
  console.log('🚀 Starting exporter test...\n');
  
  try {
    // Load the built exporter
    require('./dist/build.js');
    
    console.log('✅ Exporter loaded successfully!');
    
    if (!global.testExportFunction) {
      throw new Error('Export function not found');
    }
    
    console.log('🔄 Running export function...\n');
    
    // Run the export function
    const result = await global.testExportFunction(mockSdk, mockContext);
    
    console.log('📁 Generated files:');
    console.log('==================\n');
    
    result.forEach((file, index) => {
      console.log(`${index + 1}. ${file.path}/${file.name}`);
      console.log(`   Type: ${file.type}`);
      
      if (file.type === 'text' && file.content) {
        console.log(`   Content preview:`);
        console.log('   ' + file.content.substring(0, 200) + (file.content.length > 200 ? '...' : ''));
      }
      
      console.log('');
    });
    
    console.log(`✅ Test completed! Generated ${result.length} files.`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure to:');
    console.log('   1. Run "npm install" to install dependencies');
    console.log('   2. Run "npm run build" to build the exporter');
    console.log('   3. Check that dist/build.js exists');
  }
}

// Run the test
runTest(); 