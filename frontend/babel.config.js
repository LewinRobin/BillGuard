module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push('react-native-worklets/plugin');

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind', unstable_transformProfile: 'hermes-v0' }], 'nativewind/babel'],

    plugins,
  };
};
