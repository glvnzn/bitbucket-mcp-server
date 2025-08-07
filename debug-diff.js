#!/usr/bin/env node

// Debug script to test the enhanced diff retrieval
import { spawn } from 'child_process';

console.log('🔧 Testing Enhanced Bitbucket MCP Server Diff Retrieval\n');

// Test configuration - replace with your actual values
const testConfig = {
  workspace: process.env.BITBUCKET_WORKSPACE || 'your-workspace',
  repo_slug: process.env.BITBUCKET_REPO || 'your-repo',
  pr_id: parseInt(process.env.TEST_PR_ID || '1511'),
  test_file: process.env.TEST_FILE || 'modules/profile/src/components/emergencyContact/EmergencyContactForm.tsx'
};

console.log('📋 Test Configuration:');
console.log(`   Workspace: ${testConfig.workspace}`);
console.log(`   Repository: ${testConfig.repo_slug}`);
console.log(`   PR ID: ${testConfig.pr_id}`);
console.log(`   Test File: ${testConfig.test_file}\n`);

if (!process.env.BITBUCKET_WORKSPACE) {
  console.error('❌ Please set environment variables:');
  console.error('   BITBUCKET_WORKSPACE, BITBUCKET_REPO, TEST_PR_ID, TEST_FILE');
  process.exit(1);
}

// Function to test MCP server via stdio
function testMCPServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting MCP server...\n');
    
    const mcpServer = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let responseData = '';
    let errorData = '';

    mcpServer.stdout.on('data', (data) => {
      responseData += data.toString();
    });

    mcpServer.stderr.on('data', (data) => {
      errorData += data.toString();
      console.log('📊 Debug Output:', data.toString());
    });

    // Test sequence
    const tests = [
      // Test 1: Get PR files list
      {
        name: 'get-pull-request-files',
        request: {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'get-pull-request-files',
            arguments: {
              workspace: testConfig.workspace,
              repo_slug: testConfig.repo_slug,
              pr_id: testConfig.pr_id
            }
          }
        }
      },
      // Test 2: Get specific file diff (this was failing before)
      {
        name: 'get-pull-request-diff-file-specific',
        request: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'get-pull-request-diff',
            arguments: {
              workspace: testConfig.workspace,
              repo_slug: testConfig.repo_slug,
              pr_id: testConfig.pr_id,
              file_path: testConfig.test_file,
              max_size: 15000
            }
          }
        }
      }
    ];

    let testIndex = 0;
    
    function runNextTest() {
      if (testIndex >= tests.length) {
        mcpServer.kill();
        resolve({ responseData, errorData });
        return;
      }

      const test = tests[testIndex];
      console.log(`\n🧪 Running test ${testIndex + 1}: ${test.name}`);
      
      mcpServer.stdin.write(JSON.stringify(test.request) + '\n');
      testIndex++;
      
      // Wait a bit before next test
      setTimeout(runNextTest, 3000);
    }

    mcpServer.on('error', (error) => {
      console.error('❌ MCP Server error:', error);
      reject(error);
    });

    mcpServer.on('close', (code) => {
      console.log(`\n🏁 MCP server exited with code ${code}`);
      resolve({ responseData, errorData });
    });

    // Start first test after server initialization
    setTimeout(runNextTest, 2000);
  });
}

// Run the test
console.log('⏳ This test will run for about 10 seconds...\n');

testMCPServer()
  .then(({ responseData, errorData }) => {
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESULTS SUMMARY:');
    console.log('='.repeat(80));
    
    if (responseData) {
      console.log('\n📤 MCP Responses:');
      const responses = responseData.split('\n').filter(line => line.trim());
      responses.forEach((response, idx) => {
        try {
          const parsed = JSON.parse(response);
          console.log(`\n${idx + 1}. Response ID ${parsed.id}:`);
          if (parsed.result?.content?.[0]?.text) {
            const text = parsed.result.content[0].text;
            console.log(`   Length: ${text.length} characters`);
            console.log(`   Preview: ${text.substring(0, 200)}...`);
          }
        } catch (e) {
          console.log(`   Raw: ${response.substring(0, 100)}...`);
        }
      });
    }
    
    if (errorData) {
      console.log('\n🐛 Debug Information:');
      console.log(errorData);
    }
    
    console.log('\n✅ Test completed! Check the debug output above to see if:');
    console.log('   - File-specific diffs are now working');
    console.log('   - Commit hashes are being extracted correctly');
    console.log('   - Multiple fallback approaches are being tried');
    console.log('   - File extraction is finding the target files');
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });