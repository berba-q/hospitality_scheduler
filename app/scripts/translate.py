#!/usr/bin/env python3
"""
Improved String Extractor for i18n - Review Format
Extracts user-facing strings and outputs them for manual review
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple

class StringExtractor:
    def __init__(self):
        self.strings = defaultdict(set)
        self.file_patterns = ["*.tsx", "*.ts", "*.jsx", "*.js"]
        
        # Auto-detect project structure
        self.project_root = self.find_project_root()
        self.src_dir = self.project_root / "hospitality-scheduler-pwa" / "src"
        
        print(f"📂 Project root: {self.project_root}")
        print(f"📂 Source directory: {self.src_dir}")
        
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
        """Check if string is likely user-facing"""
        clean_string = string.strip('\'"')
        
        # Skip very short strings
        if len(clean_string) < 3:
            return False
        
        # Skip technical patterns
        technical_patterns = [
            r'^[a-z]+[A-Z]',  # camelCase variables
            r'^[A-Z_]+$',     # CONSTANTS
            r'^[a-z-]+$',     # kebab-case
            r'^\.',           # File extensions
            r'^/',            # Paths
            r'^\w+\.',        # Object properties
            r'^\d+',          # Numbers
            r'^https?://',    # URLs
            r'^#[0-9a-fA-F]', # Colors
            r'px|rem|vh|vw|%|rgb|var\(', # CSS
        ]
        
        for pattern in technical_patterns:
            if re.search(pattern, clean_string):
                return False
        
        # Skip if context suggests it's not user-facing
        skip_contexts = [
            'import ',
            'from ',
            'console.',
            'process.env',
            'className=',
            'typeof ',
            'instanceof ',
            '//',  # Comments
            '/*',  # Comments
            'interface ',
            'type ',
            'extends ',
            'implements ',
        ]
        
        for skip_context in skip_contexts:
            if skip_context in context:
                return False
        
        # Must contain letters (not just symbols/numbers)
        if not re.search(r'[A-Za-z]', clean_string):
            return False
        
        # Skip single words that are likely technical
        words = clean_string.split()
        if len(words) == 1:
            technical_words = {
                'true', 'false', 'null', 'undefined', 'string', 'number', 
                'boolean', 'object', 'array', 'function', 'void', 'any',
                'props', 'state', 'ref', 'key', 'id', 'className', 'style',
                'onClick', 'onChange', 'onSubmit', 'div', 'span', 'button',
                'input', 'form', 'img', 'src', 'alt', 'href', 'target',
            }
            if clean_string.lower() in technical_words:
                return False
        
        # Good indicators of user-facing strings
        user_facing_indicators = [
            # Common UI words
            'save', 'cancel', 'delete', 'edit', 'add', 'remove', 'submit',
            'confirm', 'close', 'open', 'back', 'next', 'previous',
            'loading', 'error', 'success', 'warning', 'failed',
            'welcome', 'hello', 'goodbye', 'thank', 'please',
            # Business domain words
            'schedule', 'staff', 'swap', 'shift', 'assign', 'manage',
            'dashboard', 'profile', 'settings', 'login', 'logout',
            # Complete sentences (likely user-facing)
            ' and ', ' or ', ' the ', ' to ', ' for ', ' with ', ' in '
        ]
        
        clean_lower = clean_string.lower()
        has_indicator = any(indicator in clean_lower for indicator in user_facing_indicators)
        
        # Multi-word strings are more likely to be user-facing
        is_multiword = len(words) > 1
        
        # Has punctuation suggesting complete sentences
        has_sentence_punct = any(punct in clean_string for punct in ['.', '!', '?', ':'])
        
        return has_indicator or is_multiword or has_sentence_punct
    
    def categorize_string(self, string: str, file_path: str) -> str:
        """Categorize string based on content and file location"""
        clean_string = string.strip('\'"').lower()
        file_name = Path(file_path).name.lower()
        
        # File-based categorization
        if 'auth' in file_name or 'login' in file_name:
            return 'auth'
        elif 'schedule' in file_name:
            return 'schedule'  
        elif 'swap' in file_name:
            return 'swaps'
        elif 'staff' in file_name:
            return 'staff'
        elif 'profile' in file_name:
            return 'profile'
        elif 'facility' in file_name or 'facilities' in file_name:
            return 'facilities'
        elif 'nav' in file_name or 'layout' in file_name:
            return 'navigation'
        
        # Content-based categorization
        if any(nav in clean_string for nav in [
            'dashboard', 'schedule', 'staff', 'profile', 'settings', 
            'logout', 'login', 'home', 'menu'
        ]):
            return 'navigation'
            
        if any(action in clean_string for action in [
            'save', 'cancel', 'delete', 'edit', 'add', 'remove', 'submit',
            'confirm', 'close', 'open', 'back', 'next', 'loading'
        ]):
            return 'common'
            
        if any(sched in clean_string for sched in [
            'schedule', 'shift', 'assign', 'daily', 'weekly', 'monthly'
        ]):
            return 'schedule'
            
        if any(swap in clean_string for swap in [
            'swap', 'request', 'approve', 'reject'
        ]):
            return 'swaps'
            
        if any(staff in clean_string for staff in [
            'staff', 'employee', 'manager', 'member'
        ]):
            return 'staff'
            
        if any(auth in clean_string for auth in [
            'sign in', 'sign out', 'login', 'logout', 'password', 'welcome'
        ]):
            return 'auth'
            
        if any(error in clean_string for error in [
            'error', 'wrong', 'failed', 'success', 'warning'
        ]):
            return 'messages'
            
        return 'common'
    
    def extract_from_file(self, file_path: Path) -> None:
        """Extract strings from a single file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove comments first
            content_no_comments = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
            content_no_comments = re.sub(r'/\*.*?\*/', '', content_no_comments, flags=re.DOTALL)
            
            # Extract strings with their context
            patterns = [
                # JSX text content
                (r'>([^<>]*[A-Za-z][^<>]*)<', 1),
                # String literals
                (r'"([^"]*[A-Za-z][^"]*)"', 1),
                (r"'([^']*[A-Za-z][^']*)'", 1),
                # Template literals (basic)
                (r'`([^`]*[A-Za-z][^`]*)`', 1),
            ]
            
            for pattern, group in patterns:
                matches = re.finditer(pattern, content_no_comments)
                for match in matches:
                    text = match.group(group).strip()
                    if not text:
                        continue
                    
                    # Get surrounding context
                    start = max(0, match.start() - 50)
                    end = min(len(content), match.end() + 50)
                    context = content[start:end].replace('\n', ' ')
                    
                    if self.is_user_facing_string(text, context):
                        category = self.categorize_string(text, str(file_path))
                        self.strings[category].add((text, str(file_path.relative_to(self.src_dir))))
                        
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
    
    def generate_review_output(self) -> str:
        """Generate human-readable output for review"""
        output = []
        output.append("# 🌍 EXTRACTED STRINGS FOR TRANSLATION")
        output.append("# Review these strings and copy relevant ones to your translation dictionaries")
        output.append("# Format: Category -> String (found in file)")
        output.append("")
        
        total_strings = sum(len(strings) for strings in self.strings.values())
        output.append(f"# Total strings found: {total_strings}")
        output.append("")
        
        for category, strings in sorted(self.strings.items()):
            if not strings:
                continue
                
            output.append(f"## {category.upper()} ({len(strings)} strings)")
            output.append("")
            
            for text, file_path in sorted(strings):
                # Clean up the text for display
                clean_text = text.replace('\n', ' ').replace('\r', '').strip()
                if len(clean_text) > 80:
                    clean_text = clean_text[:77] + "..."
                
                output.append(f"'{clean_text}' -> {file_path}")
            
            output.append("")
            output.append("### Suggested TypeScript format:")
            output.append(f"{category}: {{")
            
            for text, _ in sorted(strings):
                # Generate a simple key
                words = re.findall(r'\b\w+\b', text.lower())
                if words:
                    key = words[0]
                    for word in words[1:4]:  # Limit to 4 words for key
                        key += word.capitalize()
                    if len(key) > 25:
                        key = key[:25]
                else:
                    key = "unknown"
                
                # Clean text for output
                clean_text = text.replace("'", "\\'").replace('\n', ' ').strip()
                output.append(f"  {key}: '{clean_text}',")
            
            output.append("},")
            output.append("")
            output.append("-" * 50)
            output.append("")
        
        return "\n".join(output)
    
    def save_results(self) -> None:
        """Save results to review file"""
        content = self.generate_review_output()
        
        output_file = "extracted_strings_review.md"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f"💾 Saved strings for review: {output_file}")
        
        # Also create a simple JSON version
        json_data = {}
        for category, strings in self.strings.items():
            json_data[category] = [{"text": text, "file": file_path} for text, file_path in strings]
        
        json_file = "extracted_strings.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved JSON version: {json_file}")

def main():
    """Main function"""
    print("🔍 Improved String Extractor for i18n")
    print("=" * 50)
    
    extractor = StringExtractor()
    
    if not extractor.src_dir.exists():
        print(f"❌ Could not find source directory: {extractor.src_dir}")
        return
    
    # Extract strings
    extractor.extract_all()
    
    # Save for review
    extractor.save_results()
    
    # Print summary
    total_strings = sum(len(strings) for strings in extractor.strings.values())
    print(f"\n📊 SUMMARY")
    print(f"Total user-facing strings found: {total_strings}")
    
    for category, strings in sorted(extractor.strings.items()):
        if strings:
            print(f"  {category}: {len(strings)} strings")
    
    print(f"\n✅ DONE!")
    print(f"📖 Review 'extracted_strings_review.md' to see all found strings")
    print(f"📝 Copy relevant sections to your translation dictionaries")
    print(f"🗂️  JSON version available in 'extracted_strings.json'")

if __name__ == "__main__":
    main()