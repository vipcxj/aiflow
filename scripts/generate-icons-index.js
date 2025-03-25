/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../src/components/icons');
const outputFile = path.join(iconsDir, 'index.tsx');

// 读取icons目录
const files = fs.readdirSync(iconsDir)
  .filter(file => file.endsWith('.tsx') && file !== 'index.tsx')
  .map(file => file.replace('.tsx', ''));

// 生成导入语句
const imports = files.map(filename => 
  `import { ${toPascalCase(filename)} } from "./${filename}";`
).join('\n');

// 生成IconName类型
const iconNameType = `export type IconName =\n  '${files.join("'\n  | '")}';`;

// 生成Icon组件switch语句
const switchCases = files.map(filename => 
  `    case '${filename}':\n      return <${toPascalCase(filename)} className={className} />;`
).join('\n');

// 生成索引文件内容
const content = `// 此文件由脚本自动生成，请勿直接修改
${imports}

${iconNameType}

export type IconProps = {
  name: IconName;
  className?: string;
};

export const Icon = ({ name, className }: IconProps) => {
  switch (name) {
${switchCases}
    default:
      return null;
  }
};
`;

fs.writeFileSync(outputFile, content);
console.log(`Icons index file generated with ${files.length} icons.`);

// 辅助函数：将kebab-case转换为PascalCase
function toPascalCase(str) {
  return str.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}