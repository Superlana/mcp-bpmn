import * as esbuild from 'esbuild';

async function build() {
  try {
    console.log('Building MCP-BPMN server with esbuild...');
    
    await esbuild.build({
      entryPoints: ['src/server/index.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: 'dist/server/bundle.js',
      external: [
        '@modelcontextprotocol/sdk',
        'jsdom',
        'node:*'  // External all node built-ins
      ],
      loader: {
        '.ts': 'ts'
      },
      // This is important for resolving bpmn-js modules
      mainFields: ['module', 'main'],
      conditions: ['node', 'import', 'default'],
      resolveExtensions: ['.ts', '.js', '.json'],
      logLevel: 'info'
    });
    
    console.log('Build complete! Output: dist/server/bundle.js');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();