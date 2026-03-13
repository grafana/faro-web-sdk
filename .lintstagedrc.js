module.exports = {
  '*.{css,scss,md,yaml,yml,json}': ['prettier -w'],
  '*.{js,jsx,ts,tsx}': ['prettier -w', 'eslint --fix', 'madge --circular'],
  '*.md': ['markdownlint'],
};
