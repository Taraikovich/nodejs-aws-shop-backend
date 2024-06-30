const path = require('path');
const fs = require('fs');

const lambdaDir = path.resolve(__dirname, 'lambda-functions');
const entries = fs.readdirSync(lambdaDir).reduce((entries, file) => {
  const filePath = path.join(lambdaDir, file);
  const fileName = path.parse(file).name;
  entries[fileName] = filePath;
  return entries;
}, {});

module.exports = {
  entry: entries,
  target: 'node',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  externals: {
    'aws-sdk': 'aws-sdk', // Exclude AWS SDK since it's available in the Lambda runtime
  },
};
