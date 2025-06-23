import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { error } from '@sveltejs/kit';
import { compile } from 'mdsvex';

export type ContentMetadata = {
	title: string;
	description?: string;
	keywords?: string[];
	author?: string;
	date?: string;
	[key: string]: any;
};

export type ContentData = {
	metadata: ContentMetadata;
	content: string;
	html: string;
	slug: string;
	lang: string;
};

const CONTENT_DIR = 'src/content/www';
const SUPPORTED_LANGS = ['en', 'cs', 'de'];
const DEFAULT_LANG = 'en';

export function isValidLang(lang: string): boolean {
	return SUPPORTED_LANGS.includes(lang);
}

export function getContentPath(lang: string, slug: string): string {
	return path.join(process.cwd(), CONTENT_DIR, lang, `${slug}.md`);
}

export async function loadContent(lang: string, slug: string): Promise<ContentData> {
	// Validate language
	if (!isValidLang(lang)) {
		throw error(404, `Language '${lang}' not supported`);
	}

	// Try to load content for requested language
	let contentPath = getContentPath(lang, slug);
	let fallbackUsed = false;

	// If file doesn't exist in requested language, try fallback
	if (!fs.existsSync(contentPath)) {
		contentPath = getContentPath(DEFAULT_LANG, slug);
		fallbackUsed = true;
		
		if (!fs.existsSync(contentPath)) {
			throw error(404, `Content not found: ${slug}`);
		}
	}

	try {
		const fileContent = fs.readFileSync(contentPath, 'utf-8');
		const { data, content } = matter(fileContent);

		// Compile markdown to HTML
		const compiled = await compile(content, {
			remarkPlugins: [],
			rehypePlugins: []
		});

		if (!compiled) {
			throw new Error('Failed to compile markdown');
		}

		return {
			metadata: data as ContentMetadata,
			content,
			html: compiled.code,
			slug,
			lang: fallbackUsed ? DEFAULT_LANG : lang
		};
	} catch (err) {
		console.error(`Error loading content: ${contentPath}`, err);
		throw error(500, 'Failed to load content');
	}
}

export async function listContent(lang: string): Promise<string[]> {
	const contentDir = path.join(process.cwd(), CONTENT_DIR, lang);
	
	if (!fs.existsSync(contentDir)) {
		return [];
	}

	try {
		const files = fs.readdirSync(contentDir);
		return files
			.filter(file => file.endsWith('.md'))
			.map(file => file.replace('.md', ''));
	} catch (err) {
		console.error(`Error listing content for ${lang}:`, err);
		return [];
	}
}

export function getAllLanguagesForSlug(slug: string): string[] {
	return SUPPORTED_LANGS.filter(lang => {
		const contentPath = getContentPath(lang, slug);
		return fs.existsSync(contentPath);
	});
}