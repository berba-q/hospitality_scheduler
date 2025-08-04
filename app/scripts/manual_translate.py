#!/usr/bin/env python3
"""
Manual Translation Helper
Cleans up failed auto-translations and creates organized templates
"""

import re
import json
from pathlib import Path
from typing import Dict, List

class ManualTranslationHelper:
    def __init__(self):
        self.italian_translations = {
            # Common UI elements
            'save': 'Salva',
            'cancel': 'Annulla',
            'delete': 'Elimina',
            'edit': 'Modifica',
            'add': 'Aggiungi',
            'remove': 'Rimuovi',
            'close': 'Chiudi',
            'open': 'Apri',
            'back': 'Indietro',
            'next': 'Avanti',
            'loading': 'Caricamento...',
            'error': 'Errore',
            'success': 'Successo',
            'warning': 'Attenzione',
            'failed': 'Fallito',
            'completed': 'Completato',
            'refresh': 'Aggiorna',
            'update': 'Aggiorna',
            'create': 'Crea',
            'view': 'Visualizza',
            
            # Navigation
            'dashboard': 'Dashboard',
            'schedule': 'Pianificazione',
            'staff': 'Personale',
            'profile': 'Profilo',
            'settings': 'Impostazioni',
            'facilities': 'Strutture',
            'logout': 'Disconnetti',
            'login': 'Accedi',
            'sign in': 'Accedi',
            'sign out': 'Disconnetti',
            
            # Authentication
            'email': 'Email',
            'password': 'Password',
            'username': 'Nome utente',
            'welcome': 'Benvenuto',
            'welcome back': 'Bentornato',
            
            # Schedule/Shift related
            'shift': 'Turno',
            'schedule': 'Pianificazione',
            'assign': 'Assegna',
            'assignment': 'Assegnazione',
            'coverage': 'Copertura',
            'overtime': 'Straordinario',
            'weekly': 'Settimanale',
            'daily': 'Giornaliero',
            'monthly': 'Mensile',
            
            # Swap related
            'swap': 'Scambio',
            'request': 'Richiesta',
            'approve': 'Approva',
            'decline': 'Rifiuta',
            'pending': 'In attesa',
            'approved': 'Approvato',
            'denied': 'Negato',
            'cancelled': 'Annullato',
            
            # Staff related
            'staff': 'Personale',
            'employee': 'Dipendente',
            'manager': 'Manager',
            'supervisor': 'Supervisore',
            'team': 'Team',
            'member': 'Membro',
            
            # Facility related
            'facility': 'Struttura',
            'location': 'Posizione',
            'zone': 'Zona',
            'area': 'Area',
            'department': 'Reparto',
            
            # Time related
            'today': 'Oggi',
            'tomorrow': 'Domani',
            'yesterday': 'Ieri',
            'this week': 'Questa settimana',
            'next week': 'Settimana prossima',
            'this month': 'Questo mese',
            'start time': 'Orario di inizio',
            'end time': 'Orario di fine',
            'duration': 'Durata',
            'hours': 'Ore',
            'minutes': 'Minuti',
            
            # Common phrases
            'no data': 'Nessun dato',
            'not found': 'Non trovato',
            'not available': 'Non disponibile',
            'loading data': 'Caricamento dati',
            'please wait': 'Attendere prego',
            'try again': 'Riprova',
            'are you sure': 'Sei sicuro',
            'this action cannot be undone': 'Questa azione non può essere annullata',
            
            # Form elements
            'name': 'Nome',
            'full name': 'Nome completo',
            'phone': 'Telefono',
            'phone number': 'Numero di telefono',
            'address': 'Indirizzo',
            'role': 'Ruolo',
            'skill level': 'Livello di competenza',
            'notes': 'Note',
            'description': 'Descrizione',
            
            # Status messages
            'successfully': 'con successo',
            'successfully imported': 'Importato con successo',
            'successfully updated': 'Aggiornato con successo',
            'successfully deleted': 'Eliminato con successo',
            'failed to load': 'Impossibile caricare',
            'failed to save': 'Impossibile salvare',
            'failed to delete': 'Impossibile eliminare',
            'failed to update': 'Impossibile aggiornare',
        }
    
    def clean_it_prefix(self, text: str) -> str:
        """Remove [IT] prefix from text"""
        return re.sub(r'^\[IT\]\s*', '', text)
    
    def auto_translate_common(self, text: str) -> str:
        """Try to auto-translate common terms"""
        clean_text = self.clean_it_prefix(text).lower()
        
        # Direct matches
        if clean_text in self.italian_translations:
            return self.italian_translations[clean_text]
        
        # Partial matches for common phrases
        for eng, ita in self.italian_translations.items():
            if eng in clean_text:
                # Simple word replacement
                result = clean_text.replace(eng, ita.lower())
                # Capitalize first letter
                return result[0].upper() + result[1:] if result else text
        
        # Return cleaned text if no translation found
        return self.clean_it_prefix(text)
    
    def process_typescript_file(self, file_path: Path) -> str:
        """Process TypeScript file and improve translations"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all string assignments
        pattern = r"(\w+):\s*'(\[IT\][^']*)',"
        
        def replace_translation(match):
            key = match.group(1)
            original_text = match.group(2)
            
            # Try to improve the translation
            improved = self.auto_translate_common(original_text)
            
            # Escape single quotes
            improved = improved.replace("'", "\\'")
            
            return f"{key}: '{improved}',"
        
        # Replace all translations
        improved_content = re.sub(pattern, replace_translation, content)
        
        return improved_content
    
    def create_translation_list(self, file_path: Path) -> List[Dict]:
        """Extract all strings that need translation"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all [IT] prefixed strings
        pattern = r"(\w+):\s*'\[IT\]\s*([^']*)',"
        matches = re.findall(pattern, content)
        
        translation_items = []
        for key, text in matches:
            improved = self.auto_translate_common(f"[IT] {text}")
            needs_review = improved == text or '[IT]' in improved
            
            translation_items.append({
                'key': key,
                'english': text,
                'italian': improved,
                'needs_review': needs_review,
                'category': self.guess_category(key, text)
            })
        
        return translation_items
    
    def guess_category(self, key: str, text: str) -> str:
        """Guess the category based on key and text"""
        key_lower = key.lower()
        text_lower = text.lower()
        
        if any(term in key_lower for term in ['auth', 'login', 'password', 'sign']):
            return 'auth'
        elif any(term in key_lower for term in ['nav', 'menu', 'dashboard']):
            return 'navigation'
        elif any(term in key_lower for term in ['swap', 'request']):
            return 'swaps'
        elif any(term in key_lower for term in ['staff', 'employee']):
            return 'staff'
        elif any(term in key_lower for term in ['schedule', 'shift']):
            return 'schedule'
        elif any(term in key_lower for term in ['facility', 'location']):
            return 'facilities'
        elif any(term in key_lower for term in ['error', 'success', 'failed']):
            return 'messages'
        elif any(term in key_lower for term in ['notification', 'alert']):
            return 'notifications'
        else:
            return 'common'
    
    def generate_review_file(self, translation_items: List[Dict]) -> str:
        """Generate a human-readable review file"""
        lines = [
            "# 🇮🇹 ITALIAN TRANSLATION REVIEW",
            "# Please review and improve these translations",
            "",
            f"Total items: {len(translation_items)}",
            f"Need review: {sum(1 for item in translation_items if item['needs_review'])}",
            f"Auto-improved: {sum(1 for item in translation_items if not item['needs_review'])}",
            "",
        ]
        
        # Group by category
        by_category = {}
        for item in translation_items:
            category = item['category']
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(item)
        
        # Output each category
        for category, items in sorted(by_category.items()):
            lines.append(f"## {category.upper()} ({len(items)} items)")
            lines.append("")
            
            # Show items that need review first
            review_items = [item for item in items if item['needs_review']]
            good_items = [item for item in items if not item['needs_review']]
            
            if review_items:
                lines.append("### ⚠️  NEEDS REVIEW:")
                for item in review_items:
                    lines.append(f"- `{item['key']}`: \"{item['english']}\" → \"{item['italian']}\"")
                lines.append("")
            
            if good_items:
                lines.append("### ✅ AUTO-IMPROVED:")
                for item in good_items:
                    lines.append(f"- `{item['key']}`: \"{item['english']}\" → \"{item['italian']}\"")
                lines.append("")
            
            lines.append("---")
            lines.append("")
        
        return "\n".join(lines)
    
    def process_file(self, input_file: str):
        """Main processing function"""
        file_path = Path(input_file)
        
        if not file_path.exists():
            print(f"❌ File not found: {file_path}")
            return
        
        print(f"🔧 Processing: {file_path}")
        
        # Create translation list for review
        translation_items = self.create_translation_list(file_path)
        
        # Generate improved TypeScript file
        improved_content = self.process_typescript_file(file_path)
        
        # Save improved file
        improved_file = file_path.parent / f"{file_path.stem}_improved{file_path.suffix}"
        with open(improved_file, 'w', encoding='utf-8') as f:
            f.write(improved_content)
        
        print(f"📝 Improved file saved: {improved_file}")
        
        # Generate review file
        review_content = self.generate_review_file(translation_items)
        review_file = file_path.parent / f"{file_path.stem}_review.md"
        with open(review_file, 'w', encoding='utf-8') as f:
            f.write(review_content)
        
        print(f"📋 Review file saved: {review_file}")
        
        # Print summary
        needs_review = sum(1 for item in translation_items if item['needs_review'])
        auto_improved = len(translation_items) - needs_review
        
        print(f"\n📊 SUMMARY:")
        print(f"Total strings: {len(translation_items)}")
        print(f"Auto-improved: {auto_improved}")
        print(f"Need manual review: {needs_review}")
        print(f"Success rate: {(auto_improved/len(translation_items)*100):.1f}%")

def main():
    """Main function"""
    import sys
    
    print("🛠️  Manual Translation Helper")
    print("=" * 30)
    
    if len(sys.argv) < 2:
        print("Usage: python manual_helper.py <file.ts>")
        print("Example: python manual_helper.py it.ts")
        return
    
    helper = ManualTranslationHelper()
    helper.process_file(sys.argv[1])
    
    print("\n✅ DONE!")
    print("📖 Check the _review.md file for items that need attention")
    print("📝 Use the _improved.ts file as your starting point")

if __name__ == "__main__":
    main()