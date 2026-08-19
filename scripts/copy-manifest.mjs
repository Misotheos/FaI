import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');
const manifestSource = path.join(projectRoot, 'manifest.json');
const popupBuildSource = path.join(distDir, 'src', 'ui', 'popup.html');
const popupBuildTarget = path.join(distDir, 'popup.html');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.copyFileSync(manifestSource, path.join(distDir, 'manifest.json'));

if (fs.existsSync(popupBuildSource)) {
  const popupHtml = fs.readFileSync(popupBuildSource, 'utf8').replace('src="/popup.js"', 'src="./popup.js"');
  fs.writeFileSync(popupBuildTarget, popupHtml);
  fs.rmSync(path.join(distDir, 'src'), { recursive: true, force: true });
}
