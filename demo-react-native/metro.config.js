const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = {
  watchFolders: [workspaceRoot],

  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],

    // Custom resolver to force React from demo's node_modules
    resolveRequest: (context, moduleName, platform) => {
      // Force React and React Native to always resolve from demo's node_modules
      if (moduleName === 'react' || moduleName === 'react-native') {
        return {
          filePath: path.join(projectRoot, 'node_modules', moduleName, 'index.js'),
          type: 'sourceFile',
        };
      }

      // Let Metro resolve everything else normally
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
