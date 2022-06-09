import type * as monaco from 'monaco-editor';
import { languages, editor } from 'monaco-editor';

const languageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    blockComment: ["<!--", "-->"]
  },
  brackets: [
    ["<!--", "-->"],
    ["<", ">"],
    ["{", "}"],
    ["(", ")"]
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: "'", close: "'" },
    { open: "\"", close: "\"" },
    { open: "<!--", close: "-->", notIn: ["comment", "string"] },
    { open: "/**", close: " */", notIn: ["string"] },
	{ open: '<', close: '>', notIn: ['string'] },
  ],
  autoCloseBefore: ";:.,=}])>` \n\t",
  surroundingPairs: [
    { open: "'", close: "'" },
    { open: "\"", close: "\"" },
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: "<", close: ">" }
  ],
  folding: {
    markers: {
      start: /^\\s*<!--\\s*#region\\b.*-->/,
      end: /^\\s*<!--\\s*#endregion\\b.*-->/
    }
  }
}

const monarchLanguage: languages.IMonarchLanguage = {
	defaultToken: '',
	tokenPostfix: '.astro',
	ignoreCase: false,

	// non matched elements
	empty: [
		'area',
		'base',
		'basefont',
		'br',
		'col',
		'frame',
		'hr',
		'img',
		'input',
		'isindex',
		'link',
		'meta',
		'param'
	],

	// The main tokenizer for our languages
	tokenizer: {
		root: [
			[/<!DOCTYPE/, 'metatag', '@doctype'],
			[/<!--/, 'comment', '@comment'],
			[/^---/, 'comment', '@frontmatter'],
			[/{/, '', '@expression'],
			[/(<)((?:[\w\-]+:)?[\w\-]+)(\s*)(\/>)/, ['delimiter', 'tag', '', 'delimiter']],
			[/(<)(script)/, ['delimiter', { token: 'tag', next: '@script' }]],
			[/(<)(style)/, ['delimiter', { token: 'tag', next: '@style' }]],
			[/(<)((?:[\w\-]+:)?[\w\-]+)/, ['delimiter', { token: 'tag', next: '@otherTag' }]],
			[/(<\/)((?:[\w\-]+:)?[\w\-]+)/, ['delimiter', { token: 'tag', next: '@otherTag' }]],
			[/</, 'delimiter'],
			[/[^<{]+/], // text
		],

		doctype: [
			[/[^>]+/, 'metatag.content'],
			[/>/, 'metatag', '@pop'],
		],

		frontmatter: [
			[/^---/, { token: 'comment', next: '@pop', nextEmbedded: '@pop' }],
			[/./, { token: '@rematch', next: '@frontmatterEmbedded', nextEmbedded: 'text/javascript' }],
		],

		frontmatterEmbedded: [
			[/[^-]+|-[^-][^-]+/, { token: '@rematch', next: '@pop' }],
			[/^---/, { token: 'comment', next: '@root', nextEmbedded: '@pop' }]
		],

		expression: [
			[/[^<{}]/, { token: '@rematch', next: '@expressionEmbedded', nextEmbedded: 'text/javascript' }],
			[/</, { token: '@rematch', next: '@pop' }],
			[/}/, { token: '', next: '@pop' }]
		],
		
		expressionEmbedded: [
			[/{/, '@rematch', '@push'],
			[/</, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
			[/}/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }]
		],

		comment: [
			[/-->/, 'comment', '@pop'],
			[/[^-]+/, 'comment.content'],
			[/./, 'comment.content']
		],

		otherTag: [
			[/\/?>/, 'delimiter', '@pop'],
			[/"([^"]*)"/, 'attribute.value'],
			[/'([^']*)'/, 'attribute.value'],
			[/[\w\-]+/, 'attribute.name'],
			[/=/, 'delimiter'],
			[/[ \t\r\n]+/], // whitespace
		],

		// -- BEGIN <script> tags handling

		// After <script
		script: [
			[/type/, 'attribute.name', '@scriptAfterType'],
			[/"([^"]*)"/, 'attribute.value'],
			[/'([^']*)'/, 'attribute.value'],
			[/[\w\-]+/, 'attribute.name'],
			[/=/, 'delimiter'],
			[/>/, { token: 'delimiter', next: '@scriptEmbedded', nextEmbedded: 'text/javascript' }],
			[/[ \t\r\n]+/], // whitespace
			[/(<\/)(script\s*)(>)/, ['delimiter', 'tag', { token: 'delimiter', next: '@pop' }]]
		],

		// After <script ... type
		scriptAfterType: [
			[/=/, 'delimiter', '@scriptAfterTypeEquals'],
			[/>/, { token: 'delimiter', next: '@scriptEmbedded', nextEmbedded: 'text/javascript' }], // cover invalid e.g. <script type>
			[/[ \t\r\n]+/], // whitespace
			[/<\/script\s*>/, { token: '@rematch', next: '@pop' }]
		],

		// After <script ... type =
		scriptAfterTypeEquals: [
			[/"([^"]*)"/, { token: 'attribute.value', switchTo: '@scriptWithCustomType.$1' }],
			[/'([^']*)'/, { token: 'attribute.value', switchTo: '@scriptWithCustomType.$1' }],
			[/>/, { token: 'delimiter', next: '@scriptEmbedded', nextEmbedded: 'text/javascript' }], // cover invalid e.g. <script type=>
			[/[ \t\r\n]+/], // whitespace
			[/<\/script\s*>/, { token: '@rematch', next: '@pop' }]
		],

		// After <script ... type = $S2
		scriptWithCustomType: [
			[/>/, { token: 'delimiter', next: '@scriptEmbedded.$S2', nextEmbedded: '$S2' }],
			[/"([^"]*)"/, 'attribute.value'],
			[/'([^']*)'/, 'attribute.value'],
			[/[\w\-]+/, 'attribute.name'],
			[/=/, 'delimiter'],
			[/[ \t\r\n]+/], // whitespace
			[/<\/script\s*>/, { token: '@rematch', next: '@pop' }]
		],

		scriptEmbedded: [
			[/<\/script/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
			[/[^<]+/, '']
		],

		// -- END <script> tags handling


		// -- BEGIN <style> tags handling

		// After <style
		style: [
			[/type/, 'attribute.name', '@styleAfterType'],
			[/"([^"]*)"/, 'attribute.value'],
			[/'([^']*)'/, 'attribute.value'],
			[/[\w\-]+/, 'attribute.name'],
			[/=/, 'delimiter'],
			[/>/, { token: 'delimiter', next: '@styleEmbedded', nextEmbedded: 'text/css' }],
			[/[ \t\r\n]+/], // whitespace
			[/(<\/)(style\s*)(>)/, ['delimiter', 'tag', { token: 'delimiter', next: '@pop' }]]
		],

		// After <style ... type
		styleAfterType: [
			[/=/, 'delimiter', '@styleAfterTypeEquals'],
			[/>/, { token: 'delimiter', next: '@styleEmbedded', nextEmbedded: 'text/css' }], // cover invalid e.g. <style type>
			[/[ \t\r\n]+/], // whitespace
			[/<\/style\s*>/, { token: '@rematch', next: '@pop' }]
		],

		// After <style ... type =
		styleAfterTypeEquals: [
			[/"([^"]*)"/, { token: 'attribute.value', switchTo: '@styleWithCustomType.$1' }],
			[/'([^']*)'/, { token: 'attribute.value', switchTo: '@styleWithCustomType.$1' }],
			[/>/, { token: 'delimiter', next: '@styleEmbedded', nextEmbedded: 'text/css' }], // cover invalid e.g. <style type=>
			[/[ \t\r\n]+/], // whitespace
			[/<\/style\s*>/, { token: '@rematch', next: '@pop' }]
		],

		// After <style ... type = $S2
		styleWithCustomType: [
			[/>/, { token: 'delimiter', next: '@styleEmbedded.$S2', nextEmbedded: '$S2' }],
			[/"([^"]*)"/, 'attribute.value'],
			[/'([^']*)'/, 'attribute.value'],
			[/[\w\-]+/, 'attribute.name'],
			[/=/, 'delimiter'],
			[/[ \t\r\n]+/], // whitespace
			[/<\/style\s*>/, { token: '@rematch', next: '@pop' }]
		],

		styleEmbedded: [
			[/<\/style/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
			[/[^<]+/, '']
		],

		// -- END <style> tags handling
	},
};


export const register = () => {
    languages.register({ id: 'astro', extensions: ['astro'] });
    languages.setLanguageConfiguration('astro', languageConfiguration);
    languages.setMonarchTokensProvider('astro', monarchLanguage);
}
