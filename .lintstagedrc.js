module.exports = {
  '*.{js,jsx,ts,tsx,css,scss,md,yaml,yml,json}': ['prettier -w'],
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'madge --circular'],
  '*.md': ['markdownlint'],
};
