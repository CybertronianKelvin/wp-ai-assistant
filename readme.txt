=== WP AI Assistant ===
Contributors: yourwpusername
Donate link: https://github.com/yourwpusername/wp-ai-assistant
Tags: ai, content writer, bug explainer, openai, openrouter
Requires at least: 6.0
Tested up to: 6.9
Requires PHP: 8.0
Stable tag: 1.0.1
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

AI bug explainer and content writer for your WordPress admin. Bring your own API key — supports OpenAI, Anthropic, Gemini, and OpenRouter.

== Description ==

WP AI Assistant adds two powerful AI tools directly to your WordPress admin panel. You bring your own API key — no subscriptions, no data stored outside your site.

**Bug Explainer**

Paste any PHP error or stack trace and get a plain-English explanation of what went wrong, the root cause, and exactly how to fix it — with code examples. You can also load errors directly from your `wp-content/debug.log` with one click.

**Content Writer**

Generate blog posts, product descriptions, social captions, page introductions, and email newsletters. Choose your content type, tone, and target word count. Preview the result, edit it in-browser, and publish it as a WordPress draft post instantly.

**Supported AI Providers**

* OpenAI — GPT-4o, GPT-4o mini, GPT-4 Turbo
* Anthropic — Claude Sonnet, Haiku, Opus
* Google Gemini — Gemini 2.0 Flash, 1.5 Pro, 1.5 Flash
* OpenRouter — 100+ models from multiple providers, many completely free (Llama, DeepSeek, Gemma, NVIDIA Nemotron, Qwen and more)

**Key Features**

* Plain-English error explanations with code fix examples
* Content generation across 6 content types and 5 tones
* One-click "Create draft post" with live preview link
* Load errors from debug.log with a single click
* Searchable model selector — type any model ID, including new ones not in the list
* API keys stored securely in WordPress options, never returned in full
* Admin-only access — requires `manage_options` capability
* No data stored on our servers — requests go directly from your server to the AI provider

= External Services =

This plugin connects to third-party AI APIs to process your prompts. Connections are only made when you explicitly click "Explain this error" or "Generate content". No data is sent automatically or without your action.

Depending on which provider you configure, your request content (error text or writing prompt) will be sent to one of these services:

* **OpenAI** — [openai.com](https://openai.com) | [Privacy Policy](https://openai.com/policies/privacy-policy) | [Terms of Service](https://openai.com/policies/terms-of-use)
* **Anthropic** — [anthropic.com](https://anthropic.com) | [Privacy Policy](https://www.anthropic.com/privacy) | [Terms of Service](https://www.anthropic.com/terms)
* **Google Gemini** — [ai.google.dev](https://ai.google.dev) | [Privacy Policy](https://policies.google.com/privacy) | [Terms of Service](https://policies.google.com/terms)
* **OpenRouter** — [openrouter.ai](https://openrouter.ai) | [Privacy Policy](https://openrouter.ai/privacy) | [Terms of Service](https://openrouter.ai/terms)

You choose which provider to connect to. None of these connections are made without your API key being configured in the plugin settings.

== Installation ==

1. Upload the `wp-ai-assistant` folder to `/wp-content/plugins/`
2. Activate the plugin from **Plugins → Installed Plugins** in wp-admin
3. Go to **AI Assistant** in the admin sidebar
4. Click the **Settings** tab and enter your API key
5. Choose your provider and model, then save
6. Start using Bug Explainer and Content Writer

= Getting a Free API Key =

* **OpenRouter (recommended)** — Sign up at [openrouter.ai](https://openrouter.ai). Many models are completely free with no credit card required
* **Google Gemini** — Get a free key at [aistudio.google.com](https://aistudio.google.com)
* **OpenAI** — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
* **Anthropic** — [console.anthropic.com](https://console.anthropic.com)

== Frequently Asked Questions ==

= Does this plugin store my prompts or API keys on external servers? =

No. API requests are made directly from your WordPress server to whichever AI provider you choose. Your API key is stored only in your WordPress database. We do not operate any proxy or middleware server.

= Which AI model should I use? =

For a free start: select OpenRouter and use `deepseek/deepseek-v4-flash:free` or `openai/gpt-oss-120b:free`. For best quality: GPT-4o or Claude Sonnet 4.

= I keep getting a rate limit error =

Switch to a less popular free model. `meta-llama/llama-3.3-70b-instruct:free` gets heavily used and rate-limits fast. Try `deepseek/deepseek-v4-flash:free` or `google/gemma-4-31b-it:free` instead.

= The model I want isn't in the list =

Type the model ID directly into the Model field — it accepts any free-text input. This means the plugin works with any new models added to OpenRouter or any other OpenAI-compatible endpoint.

= Does it work with self-hosted or other OpenAI-compatible APIs? =

Not as a named provider in this version, but OpenRouter gives you access to 100+ models via a single key. A future release may add a custom endpoint option.

= What PHP version is required? =

PHP 8.0 or higher. PHP 8.1+ is recommended for best performance.

= Is this plugin GDPR compliant? =

The plugin itself stores only your API key and provider settings in `wp_options`. No personal data from your WordPress users is ever sent to any AI provider. You are responsible for ensuring that the content you send to AI APIs complies with your applicable data protection obligations.

== Screenshots ==

1. Settings — select your AI provider (OpenAI, Anthropic, Gemini, or OpenRouter), enter your API key, and search or type any model ID.
2. Bug Explainer — paste a PHP error or load it directly from debug.log. Get a plain-English explanation, root cause, and suggested code fix with syntax-highlighted code blocks.
3. Content Writer — choose content type, tone, and word count. Generate, preview, and publish as a WordPress draft post in one click.

== Changelog ==

= 1.0.1 =
* Fixed PHP execution time limit causing crashes with slower AI models
* Fixed preview URL for sites not using pretty permalinks
* Improved markdown rendering — code blocks now render with dark background
* Added searchable + free-text model input for OpenRouter
* Updated live OpenRouter free model list (24 verified free models)
* Added "Copy" button to code blocks in bug explanations

= 1.0.0 =
* Initial release — Bug Explainer and Content Writer with OpenAI, Anthropic, Gemini, and OpenRouter support

== Upgrade Notice ==

= 1.0.1 =
Fixes PHP timeout crashes on slow AI models and broken preview links on non-pretty-permalink sites. Recommended for all users.
