module.exports = {
  '*.{js,jsx,ts,tsx,css,scss,md,yaml,yml,json}': ['prettier -w'],
  '*.{js,jsx,ts,tsx}': ['eslint', 'madge --extensions js,jsx,ts,tsx --circular --ts-config=tsconfig.json'],
  '*.md': ['markdownlint'],
};
