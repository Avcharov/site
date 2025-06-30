import fs from 'fs/promises';
import path from 'path';

const DOCS_ROOT_DIR = 'docs';
const OUTPUT_FILENAME = 'llms.txt';

/**
 * Recursively finds all Markdown files in a given directory.
 * (This function remains unchanged)
 */
async function getMarkdownFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getMarkdownFiles(res) : res;
    }),
  );
  return Array.prototype.concat(...files).filter((file) => file.endsWith('.md'));
}

/**
 * Removes frontmatter block from the start of markdown content.
 */
function stripFrontmatter(content) {
  // This regex matches the "---" block at the very beginning of the file.
  const frontmatterRegex = /^---\s*([\s\S]*?)\s*---\s*/;
  const match = content.match(frontmatterRegex);

  // If a frontmatter block is found, return the content that comes after it.
  // The substring method removes the entire matched block.
  if (match) {
    return content.substring(match[0].length);
  }

  // If no frontmatter is found, return the original content unchanged.
  return content;
}

/**
 * Cleans the markdown content by removing docs-specific formatting.
 */
function cleanMarkdown(content) {
  let processed = content;
  processed = processed.replace(/^:::(?:note|info|caution)\s*\n([\s\S]*?)\n:::$/gm, '$1');
  processed = processed.replace(/<\/?Fragment>/g, '');
  processed = processed.replace(/<br\s*\/?>/gi, '\n');
  processed = processed.replace(/(?:\s*\n){3,}/g, '\n\n');
  return processed.trim();
}

async function main() {
  const docsDir = path.resolve(process.cwd(), DOCS_ROOT_DIR);
  console.log(`Scanning for markdown files in: ${docsDir}`);

  let allFiles;
  try {
    allFiles = await getMarkdownFiles(docsDir);
  } catch (error) {
    console.error(`Error: Failed to read documentation directory "${docsDir}".`);
    console.error('Please ensure you are running this script from the root of the stenciljs/site repository.');
    console.error(error.message);
    process.exit(1);
  }

  console.log(`Found ${allFiles.length} markdown files to process.`);

  let finalOutput = '';

  for (const filePath of allFiles) {
    try {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`  Processing: ${relativePath}`);
      const rawContent = await fs.readFile(filePath, 'utf-8');

      const contentWithoutFrontmatter = stripFrontmatter(rawContent);
      const cleanedContent = cleanMarkdown(contentWithoutFrontmatter);

      finalOutput += `\n\n`;
      finalOutput += cleanedContent;

    } catch (fileReadError) {
      console.warn(`  Warning: Could not read or process file "${filePath}". Skipping.`);
      console.warn(`  ${fileReadError.message}`);
    }
  }
  
  const outputFilePath = path.resolve(process.cwd(), OUTPUT_FILENAME);
  try {
    await fs.writeFile(outputFilePath, finalOutput.trim(), 'utf-8');
    console.log(`\n✅ Successfully generated combined file: ${outputFilePath}`);
  } catch (error) {
    console.error(`\nError: Failed to write output file "${outputFilePath}".`);
    console.error(error.message);
    process.exit(1);
  }
}

main();