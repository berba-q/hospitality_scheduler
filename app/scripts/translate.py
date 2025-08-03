#!/usr/bin/env python3
"""
Enhanced String Extractor & Auto-Translator for i18n
Extracts strings, deduplicates, creates templates, and auto-translates
"""

import asyncio
import os
import re
import json
import hashlib
import time
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass

try:
    from googletrans import Translator
    GOOGLE_TRANSLATE_AVAILABLE = True
except ImportError:
    GOOGLE_TRANSLATE_AVAILABLE = False
    print("⚠️  googletrans not available. Run: pip install googletrans==4.0.0rc1")

@dataclass
class TranslationString:
    text: str
    file_path: str
    category: str
    key: str = ""
    is_template: bool = False
    template_params: List[str] = None
    priority: int = 0  # Higher = more important

class EnhancedStringExtractor:
    def __init__(self, target_languages: Optional[List[str]] = None):
        self.strings = defaultdict(list)
        self.file_patterns = ["*.tsx", "*.ts", "*.jsx", "*.js"]
        
        # Auto-detect project structure
        self.project_root = self.find_project_root()
        self.src_dir = self.project_root / "hospitality-scheduler-pwa" / "src"
        self.i18n_dir = self.src_dir / "lib" / "i18n" / "dictionaries"
        
        # Translation setup (use dedicated service URL and simple cache)
        self.translator = Translator(service_urls=['translate.googleapis.com']) if GOOGLE_TRANSLATE_AVAILABLE else None
        self._translation_cache: Dict[Tuple[str, str], str] = {}
        # Default target languages if none are provided
        self.target_languages = target_languages or ['it', 'es', 'fr', 'de']
        
        print(f"📂 Project root: {self.project_root}")
        print(f"📂 Source directory: {self.src_dir}")
        print(f"📂 i18n directory: {self.i18n_dir}")
        
    def find_project_root(self) -> Path:
        """Find the project root directory"""
        current_dir = Path.cwd()
        
        # Check if we're already in the project root
        if (current_dir / "hospitality-scheduler-pwa").exists():
            return current_dir
        
        # Check parent directories
        for parent in current_dir.parents:
            if (parent / "hospitality-scheduler-pwa").exists():
                return parent
        
        # If not found, check if we're inside the PWA directory
        if current_dir.name == "hospitality-scheduler-pwa":
            return current_dir.parent
        
        return current_dir
        
    def is_user_facing_string(self, string: str, context: str) -> bool:
        """Enhanced check if string is likely user-facing"""
        clean_string = string.strip('\'"')
        
        # Skip very short strings
        if len(clean_string) < 2:
            return False
        
        # Skip technical patterns (enhanced)
        technical_patterns = [
            r'^[a-z]+(?:[A-Z][a-z0-9]+)+$',  # camelCase variables
            r'^[A-Z_]+$',     # CONSTANTS
            r'^[a-z-]+$',     # kebab-case (but allow some exceptions)
            r'^\.',           # File extensions
            r'^/',            # Paths
            r'^\w+\.',        # Object properties
            r'^\d+',          # Numbers only
            r'^https?://',    # URLs
            r'^#[0-9a-fA-F]', # Colors
            r'px|rem|vh|vw|%|rgb|var\(', # CSS
            r'^[a-z]+(_[a-z0-9]+)+$',   # snake_case variables
            r'^[\w\-]+:[\w\-]+',        # CSS properties
            r'^\$\{.*\}$',    # Template variable only
        ]
        
        for pattern in technical_patterns:
            if re.search(pattern, clean_string):
                return False
        
        # Skip if context suggests it's not user-facing
        skip_contexts = [
            'import ', 'from ', 'console.', 'process.env', 'className=',
            'typeof ', 'instanceof ', '//', '/*', 'interface ', 'type ',
            'extends ', 'implements ', 'console.log', 'console.error',
            'console.warn', 'throw new', 'new Error', 'catch',
        ]
        
        for skip_context in skip_contexts:
            if skip_context in context:
                return False
        
        # Must contain letters
        if not re.search(r'[A-Za-z]', clean_string):
            return False
        
        # Skip single technical words
        words = clean_string.split()
        if len(words) == 1:
            technical_words = {
                'true', 'false', 'null', 'undefined', 'string', 'number', 
                'boolean', 'object', 'array', 'function', 'void', 'any',
                'props', 'state', 'ref', 'key', 'id', 'style', 'div', 'span', 
                'button', 'input', 'form', 'img', 'src', 'alt', 'href', 'target',
                'width', 'height', 'left', 'right', 'top', 'bottom', 'center',
                'auto', 'none', 'block', 'inline', 'flex', 'grid', 'absolute',
                'relative', 'fixed', 'static', 'hidden', 'visible', 'pointer',
                'default', 'text', 'cursor', 'border', 'margin', 'padding',
            }
            if clean_string.lower() in technical_words:
                return False

        # Skip CSS utility strings
        css_patterns = [
            r'^(sm:|md:|lg:|xl:|2xl:)?(hover:|focus:|active:|disabled:|dark:)?[a-z0-9\-_/[\]&]+$',
            r'^aria-[a-z\-]+$',
            r'^data-[a-z\-]+$',
        ]
        
        for pattern in css_patterns:
            if re.match(pattern, clean_string):
                return False

        # Skip long utility class combinations
        if ' ' in clean_string:
            tokens = clean_string.split()
            if len(tokens) >= 3:
                css_like = sum(1 for tok in tokens 
                             if re.match(r'^[a-z0-9\-_:[\]/]+$', tok) and ('-' in tok or ':' in tok))
                if css_like / len(tokens) > 0.5:
                    return False

        # Skip code-like patterns
        if re.search(r'[{};:<>()[\]=]', clean_string):
            return False
        
        # Positive indicators
        user_facing_indicators = [
            'save', 'cancel', 'delete', 'edit', 'add', 'remove', 'submit',
            'confirm', 'close', 'open', 'back', 'next', 'previous', 'continue',
            'loading', 'error', 'success', 'warning', 'failed', 'completed',
            'welcome', 'hello', 'goodbye', 'thank', 'please', 'sorry',
            'schedule', 'staff', 'swap', 'shift', 'assign', 'manage',
            'dashboard', 'profile', 'settings', 'login', 'logout', 'sign',
            'email', 'password', 'name', 'phone', 'address', 'facility',
            'notification', 'message', 'alert', 'update', 'create', 'view',
        ]
        
        clean_lower = clean_string.lower()
        has_indicator = any(indicator in clean_lower for indicator in user_facing_indicators)
        
        # Multi-word strings are more likely to be user-facing
        is_multiword = len(words) > 1
        
        # Has sentence punctuation
        has_sentence_punct = any(punct in clean_string for punct in ['.', '!', '?', ':'])
        
        # Contains common English words
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'to', 'for', 'with', 'in', 'on', 'at', 'by', 'from', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'can', 'may', 'must', 'this', 'that', 'these', 'those', 'your', 'you', 'we', 'they', 'it', 'he', 'she'}
        has_common_words = any(word.lower() in common_words for word in words)
        
        return has_indicator or is_multiword or has_sentence_punct or has_common_words
    
    def categorize_string(self, string: str, file_path: str) -> str:
        """Enhanced categorization with better logic"""
        clean_string = string.strip('\'"').lower()
        file_name = Path(file_path).name.lower()
        dir_path = str(Path(file_path).parent).lower()
        
        # File/directory-based categorization
        if any(auth in file_name for auth in ['auth', 'login', 'signin', 'signup']):
            return 'auth'
        elif any(sched in file_name for sched in ['schedule', 'calendar', 'shift']):
            return 'schedule'  
        elif any(swap in file_name for swap in ['swap', 'request', 'trade']):
            return 'swaps'
        elif any(staff in file_name for staff in ['staff', 'employee', 'user', 'profile']):
            return 'staff'
        elif any(fac in file_name for fac in ['facility', 'facilities', 'location']):
            return 'facilities'
        elif any(nav in file_name for nav in ['nav', 'layout', 'header', 'sidebar', 'menu']):
            return 'navigation'
        elif any(err in file_name for err in ['error', 'boundary', 'fallback']):
            return 'errors'
        elif any(notif in file_name for notif in ['notification', 'alert', 'toast']):
            return 'notifications'
        
        # Content-based categorization (enhanced)
        if any(nav in clean_string for nav in [
            'dashboard', 'schedule', 'staff', 'profile', 'settings', 
            'logout', 'login', 'home', 'menu', 'navigation'
        ]):
            return 'navigation'
            
        if any(action in clean_string for action in [
            'save', 'cancel', 'delete', 'edit', 'add', 'remove', 'submit',
            'confirm', 'close', 'open', 'back', 'next', 'loading', 'refresh'
        ]):
            return 'common'
            
        if any(sched in clean_string for sched in [
            'schedule', 'shift', 'assign', 'daily', 'weekly', 'monthly', 'calendar'
        ]):
            return 'schedule'
            
        if any(swap in clean_string for swap in [
            'swap', 'request', 'approve', 'reject', 'trade', 'coverage'
        ]):
            return 'swaps'
            
        if any(staff in clean_string for staff in [
            'staff', 'employee', 'manager', 'member', 'user', 'team'
        ]):
            return 'staff'
            
        if any(auth in clean_string for auth in [
            'sign in', 'sign out', 'login', 'logout', 'password', 'welcome', 'authentication'
        ]):
            return 'auth'
            
        if any(error in clean_string for error in [
            'error', 'wrong', 'failed', 'success', 'warning', 'danger', 'alert'
        ]):
            return 'messages'
            
        if any(notif in clean_string for notif in [
            'notification', 'notify', 'alert', 'message', 'reminder'
        ]):
            return 'notifications'
            
        return 'common'
    
    def create_template(self, string: str) -> Tuple[str, List[str]]:
        """Convert strings with variables into templates"""
        # Find ${variable} patterns
        variables = re.findall(r'\$\{([^}]+)\}', string)
        if variables:
            template = string
            params = []
            for i, var in enumerate(variables):
                placeholder = f"{{{i}}}"
                template = template.replace(f"${{{var}}}", placeholder)
                params.append(var)
            return template, params
        
        # Find interpolated patterns like "Hello John"
        # This is more complex and would require context analysis
        return string, []
    
    def generate_key(self, text: str, category: str) -> str:
        """Generate a meaningful key for the translation"""
        # Clean the text
        clean_text = re.sub(r'[^\w\s]', ' ', text.lower())
        words = [w for w in clean_text.split() if len(w) > 2]
        
        if not words:
            # Fallback to hash if no good words
            return f"key_{hashlib.md5(text.encode()).hexdigest()[:8]}"
        
        # Take first few meaningful words
        key_words = words[:3]
        key = ''.join(word.capitalize() for word in key_words)
        
        # Ensure it starts with lowercase
        if key:
            key = key[0].lower() + key[1:]
        
        # Limit length
        if len(key) > 30:
            key = key[:30]
        
        return key or f"key_{hashlib.md5(text.encode()).hexdigest()[:8]}"
    
    def calculate_priority(self, text: str, file_path: str) -> int:
        """Calculate priority for translation (higher = more important)"""
        priority = 0
        
        # High priority words
        high_priority_words = [
            'error', 'failed', 'success', 'loading', 'save', 'cancel', 'delete',
            'login', 'logout', 'welcome', 'dashboard', 'schedule', 'staff'
        ]
        
        for word in high_priority_words:
            if word.lower() in text.lower():
                priority += 10
        
        # Navigation and common UI elements are high priority
        if any(nav in file_path.lower() for nav in ['nav', 'layout', 'header']):
            priority += 5
        
        # Short, commonly used strings get higher priority
        if len(text.split()) <= 3 and len(text) <= 20:
            priority += 3
        
        # Strings in core components get higher priority
        core_paths = ['dashboard', 'layout', 'common', 'ui']
        if any(core in file_path.lower() for core in core_paths):
            priority += 2
        
        return priority
    
    def extract_from_file(self, file_path: Path) -> None:
        """Extract strings from a single file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove comments
            content_no_comments = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
            content_no_comments = re.sub(r'/\*.*?\*/', '', content_no_comments, flags=re.DOTALL)

            # Remove className attributes
            content_clean = re.sub(r'className\s*=\s*["\'][^"\']*["\']', '', content_no_comments)
            
            # Enhanced patterns for extraction
            patterns = [
                # JSX text content
                (r'>\s*([^<\{\}\n]+[A-Za-z][^<\{\}\n]*)\s*<', 1),
                # User-facing attributes
                (r'\b(?:placeholder|alt|title|aria-label|label)\s*=\s*"([^"]*[A-Za-z][^"]*)"', 1),
                (r"\b(?:placeholder|alt|title|aria-label|label)\s*=\s*'([^']*[A-Za-z][^']*)'", 1),
                # String literals (more selective)
                (r'"([^"]*[A-Za-z][^"]*)"', 1),
                (r"'([^']*[A-Za-z][^']*)'", 1),
                # Template literals
                (r'`([^`]*[A-Za-z][^`]*)`', 1),
            ]
            
            for pattern, group in patterns:
                matches = re.finditer(pattern, content_clean)
                for match in matches:
                    raw_text = match.group(group)
                    if not raw_text:
                        continue

                    # Handle template literals with variables
                    if '${' in raw_text:
                        segments = [seg.strip() for seg in re.split(r'\$\{[^}]+\}', raw_text) if seg.strip()]
                        # Also keep the full template
                        segments.append(raw_text)
                    else:
                        segments = [raw_text]

                    for text in segments:
                        # Get context
                        start = max(0, match.start() - 50)
                        end = min(len(content_clean), match.end() + 50)
                        context = content_clean[start:end].replace('\n', ' ')

                        if self.is_user_facing_string(text, context):
                            category = self.categorize_string(text, str(file_path))
                            key = self.generate_key(text, category)
                            priority = self.calculate_priority(text, str(file_path))
                            
                            template, params = self.create_template(text)
                            is_template = len(params) > 0
                            
                            trans_string = TranslationString(
                                text=text,
                                file_path=str(file_path.relative_to(self.src_dir)),
                                category=category,
                                key=key,
                                is_template=is_template,
                                template_params=params,
                                priority=priority
                            )
                            
                            self.strings[category].append(trans_string)
                        
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    def extract_all(self) -> None:
        """Extract strings from all files"""
        if not self.src_dir.exists():
            print(f"❌ Source directory '{self.src_dir}' not found!")
            return
            
        print(f"🔍 Scanning {self.src_dir} for user-facing strings...")
        
        file_count = 0
        for pattern in self.file_patterns:
            for file_path in self.src_dir.rglob(pattern):
                if any(skip in str(file_path) for skip in ['node_modules', '.next', 'dist', 'build']):
                    continue
                    
                self.extract_from_file(file_path)
                file_count += 1
                
        print(f"📁 Processed {file_count} files")
    
    def deduplicate_strings(self) -> None:
        """Remove duplicate strings and merge similar ones"""
        print("🔄 Deduplicating strings...")
        
        for category in self.strings:
            seen_texts = {}
            unique_strings = []
            
            # Sort by priority first (highest first)
            sorted_strings = sorted(self.strings[category], key=lambda x: x.priority, reverse=True)
            
            for trans_string in sorted_strings:
                text_lower = trans_string.text.lower().strip()
                
                if text_lower not in seen_texts:
                    seen_texts[text_lower] = trans_string
                    unique_strings.append(trans_string)
                else:
                    # Update the existing one if this has higher priority
                    existing = seen_texts[text_lower]
                    if trans_string.priority > existing.priority:
                        unique_strings.remove(existing)
                        unique_strings.append(trans_string)
                        seen_texts[text_lower] = trans_string
            
            self.strings[category] = unique_strings
    
    def translate_text(self, text: str, target_lang: str) -> str:
        """
        Translate text with caching, async‑aware googletrans handling,
        retries and simple rate‑limiting.
        """
        if not self.translator:
            return f"[{target_lang.upper()}] {text}"

        cache_key = (text, target_lang)
        if cache_key in self._translation_cache:
            return self._translation_cache[cache_key]

        max_tries = 3
        base_delay = 0.4  # seconds

        for attempt in range(1, max_tries + 1):
            try:
                pending = self.translator.translate(text, dest=target_lang, src='en')

                # googletrans 4.x sometimes returns an awaitable coroutine
                if asyncio.iscoroutine(pending):
                    try:
                        loop = asyncio.get_event_loop()
                        # If we got a loop but it's closed, ignore it
                        if loop.is_closed():
                            raise RuntimeError("loop closed")

                        if loop.is_running():
                            # Run in the existing running loop
                            fut = asyncio.run_coroutine_threadsafe(pending, loop)
                            result = fut.result()
                        else:
                            # Run in this (not running) loop
                            result = loop.run_until_complete(pending)
                    except RuntimeError:
                        # No loop, or loop closed → create a new one
                        result = asyncio.run(pending)
                else:
                    result = pending

                translated = result.text
                self._translation_cache[cache_key] = translated
                time.sleep(base_delay)  # basic rate‑limit
                return translated

            except Exception as exc:
                wait = base_delay * attempt
                print(f"⚠️  Translate attempt {attempt} failed for '{text}' → {target_lang}: {exc} (retry {attempt}/{max_tries} in {wait:.1f}s)")
                time.sleep(wait)

        # Give up after retries
        return f"[{target_lang.upper()}] {text}"
    
    def generate_typescript_dictionary(self, strings_by_category: Dict[str, List[TranslationString]], 
                                     language: str = 'en') -> str:
        """Generate TypeScript dictionary file"""
        
        if language == 'en':
            comment = "// English translations (source)"
        else:
            comment = f"// Auto-generated {language.upper()} translations"
        
        lines = [
            comment,
            "// Generated by Enhanced Auto-Translator script",
            "",
            f"export const {language} = {{"
        ]
        
        for category, strings in sorted(strings_by_category.items()):
            if not strings:
                continue
                
            lines.append(f"  {category}: {{")
            
            # Sort by priority and then alphabetically
            sorted_strings = sorted(strings, key=lambda x: (-x.priority, x.key))
            
            for trans_string in sorted_strings:
                if language == 'en':
                    translated_text = trans_string.text
                else:
                    translated_text = self.translate_text(trans_string.text, language)
                
                # Escape quotes and handle templates
                safe_text = translated_text.replace("'", "\\'").replace('\n', '\\n')
                
                # Add comments for templates
                if trans_string.is_template:
                    lines.append(f"    // Template with params: {', '.join(trans_string.template_params)}")
                
                lines.append(f"    {trans_string.key}: '{safe_text}',")
            
            lines.append("  },")
            lines.append("")
        
        lines.extend([
            "} as const;",
            "",
            f"export default {language};"
        ])
        
        return '\n'.join(lines)
    
    def save_dictionaries(self) -> None:
        """Save TypeScript dictionary files"""
        if not self.i18n_dir.exists():
            self.i18n_dir.mkdir(parents=True, exist_ok=True)
        
        # Create auto-translated directory
        auto_dir = self.i18n_dir / "auto-translated"
        auto_dir.mkdir(exist_ok=True)
        
        print("💾 Generating dictionary files...")
        
        # Generate English (source) dictionary
        en_content = self.generate_typescript_dictionary(self.strings, 'en')
        en_file = auto_dir / "en.ts"
        with open(en_file, 'w', encoding='utf-8') as f:
            f.write(en_content)
        print(f"📝 Generated: {en_file}")
        
        # Generate translated dictionaries
        for lang in self.target_languages:
            print(f"🌍 Translating to {lang.upper()}...")
            translated_content = self.generate_typescript_dictionary(self.strings, lang)
            lang_file = auto_dir / f"{lang}.ts"
            with open(lang_file, 'w', encoding='utf-8') as f:
                f.write(translated_content)
            print(f"📝 Generated: {lang_file}")
    
    def generate_summary_report(self) -> str:
        """Generate a summary report"""
        lines = [
            "# 📊 Translation Extraction Summary",
            "",
            f"**Total categories:** {len(self.strings)}",
            f"**Total strings:** {sum(len(strings) for strings in self.strings.values())}",
            f"**Target languages:** {', '.join(self.target_languages)}",
            "",
            "## Category Breakdown",
            ""
        ]
        
        for category, strings in sorted(self.strings.items()):
            if not strings:
                continue
                
            templates = sum(1 for s in strings if s.is_template)
            high_priority = sum(1 for s in strings if s.priority >= 10)
            
            lines.extend([
                f"### {category.upper()} ({len(strings)} strings)",
                f"- Templates: {templates}",
                f"- High priority: {high_priority}",
                ""
            ])
            
            # Show top 5 high priority strings
            top_strings = sorted(strings, key=lambda x: x.priority, reverse=True)[:5]
            for ts in top_strings:
                priority_indicator = "🔥" if ts.priority >= 10 else "⭐" if ts.priority >= 5 else ""
                template_indicator = "📝" if ts.is_template else ""
                lines.append(f"- {priority_indicator}{template_indicator} `{ts.key}`: \"{ts.text[:50]}{'...' if len(ts.text) > 50 else ''}\"")
            
            lines.append("")
        
        lines.extend([
            "## Next Steps",
            "",
            "1. Review the auto-generated files in `auto-translated/`",
            "2. Copy relevant translations to your main dictionary files",
            "3. Manually review and improve auto-translations",
            "4. Update your TypeScript types to include new categories",
            "5. Test translations in your app",
            "",
            "## Files Generated",
            "",
            "- `auto-translated/en.ts` - Source English strings",
        ])
        
        for lang in self.target_languages:
            lines.append(f"- `auto-translated/{lang}.ts` - Auto-translated {lang.upper()}")
        
        return '\n'.join(lines)
    
    def save_summary(self) -> None:
        """Save summary report"""
        summary = self.generate_summary_report()
        summary_file = "translation_summary.md"
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(summary)
        print(f"📋 Summary saved: {summary_file}")

def main():
    """Main function"""
    print("🚀 Enhanced String Extractor & Auto-Translator")
    print("=" * 50)
    
    if not GOOGLE_TRANSLATE_AVAILABLE:
        print("⚠️  Google Translate not available. Install with:")
        print("   pip install googletrans==4.0.0rc1")
        print("   Continuing without auto-translation...")
        print()

    parser = argparse.ArgumentParser(description="Enhanced String Extractor & Auto‑Translator")
    parser.add_argument(
        "--langs",
        help="Comma‑separated list of target language codes (e.g. it,fr). "
             "If omitted, all default languages are processed.",
        default=""
    )
    args = parser.parse_args()
    # Determine languages list
    langs = [lang.strip() for lang in args.langs.split(",") if lang.strip()] if args.langs else None

    extractor = EnhancedStringExtractor(target_languages=langs)
    print(f"🌐 Target languages this run: {', '.join(extractor.target_languages)}")
    
    if not extractor.src_dir.exists():
        print(f"❌ Could not find source directory: {extractor.src_dir}")
        return
    
    # Extract strings
    extractor.extract_all()
    
    # Deduplicate
    extractor.deduplicate_strings()
    
    # Save dictionaries
    extractor.save_dictionaries()
    
    # Save summary
    extractor.save_summary()
    
    # Print final summary
    total_strings = sum(len(strings) for strings in extractor.strings.values())
    print(f"\n📊 FINAL SUMMARY")
    print(f"Total unique strings: {total_strings}")
    
    for category, strings in sorted(extractor.strings.items()):
        if strings:
            templates = sum(1 for s in strings if s.is_template)
            high_priority = sum(1 for s in strings if s.priority >= 10)
            print(f"  {category}: {len(strings)} strings ({templates} templates, {high_priority} high priority)")
    
    print(f"\n✅ DONE!")
    print(f"📁 Check the auto-translated/ directory for generated files")
    print(f"📋 See translation_summary.md for detailed breakdown")
    if GOOGLE_TRANSLATE_AVAILABLE:
        print(f"🌍 Auto-translated to: {', '.join(extractor.target_languages)}")
    else:
        print(f"⚠️  Manual translation needed (Google Translate not available)")

if __name__ == "__main__":
    main()