const path = require('path');

module.exports = {
  entry: './src/index.ts',
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '../public'),
  },
  devServer: {
    static: path.join(__dirname, '../public'),
    compress: true,
    port: 9000,
  },
};
