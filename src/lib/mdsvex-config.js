/**
 * Custom MDsveX configuration with Mermaid support
 */

export function createMermaidHighlighter() {
	return (code, lang, meta) => {
		if (lang === 'mermaid') {
			// Return a special div that will be processed by our Svelte component
			const encodedCode = encodeURIComponent(code.trim());
			return `<div class="mermaid-placeholder" data-code="${encodedCode}">${code}</div>`;
		}
		
		// For other languages, return standard highlighting
		return `<pre><code class="language-${lang || ''}">${escapeHtml(code)}</code></pre>`;
	};
}

function escapeHtml(text) {
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, (m) => map[m]);
}