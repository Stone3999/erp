const fs = require('fs');
const path = require('path');

const targetDirs = [
    { dir: 'backend', ext: ['.js'] },
    { dir: 'erp/src', ext: ['.ts', '.html', '.css'] }
];

function getFiles(dir, exts) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file, exts));
        } else {
            if (exts.includes(path.extname(file))) {
                results.push(file);
            }
        }
    });
    return results;
}

function removeComments(filePath) {
    const ext = path.extname(filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;

    if (ext === '.js' || ext === '.ts' || ext === '.css') {
        // Remove multi-line comments: /* ... */
        // Remove single-line comments: // ... (JS/TS only)
        // We use a regex that handles strings to avoid stripping // inside strings.
        
        const regex = ext === '.css' 
            ? /\/\*[\s\S]*?\*\//g 
            : /\/\*[\s\S]*?\*\/|(\/\/.*)|(["'`])(?:\\.|(?!\2).)*\2/g;

        newContent = content.replace(regex, (match, p1, p2) => {
            if (match.startsWith('/*')) return ''; // Multi-line comment
            if (p1) return ''; // Single-line comment (only if p1 matched, i.e., not a string)
            return match; // It's a string, return it as is
        });
    } else if (ext === '.html') {
        // Remove HTML comments: <!-- ... -->
        newContent = content.replace(/<!--[\s\S]*?-->/g, '');
    }

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Removed comments from: ${filePath}`);
    }
}

targetDirs.forEach(target => {
    const dirPath = path.resolve(process.cwd(), target.dir);
    if (fs.existsSync(dirPath)) {
        const files = getFiles(dirPath, target.ext);
        files.forEach(removeComments);
    } else {
        console.warn(`Directory not found: ${target.dir}`);
    }
});
