// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The prebuilt content database is shipped as an asset.
config.resolver.assetExts.push('db');

module.exports = config;
