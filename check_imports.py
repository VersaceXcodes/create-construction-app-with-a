
import os
import re
import sys

def check_imports(root_dir):
    error_count = 0
    for subdir, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(subdir, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    try:
                        content = f.read()
                    except UnicodeDecodeError:
                        continue
                    
                    # Match imports like import ... from '...'
                    imports = re.findall(r'from\s+[\'"](.+)[\'"]', content)
                    for imp in imports:
                        if imp.startswith('@/'):
                            # Resolve alias
                            rel_path = imp[2:]
                            abs_path = os.path.join(root_dir, rel_path)
                            
                            # Check extensions
                            found = False
                            for ext in ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '']:
                                if os.path.exists(abs_path + ext):
                                    found = True
                                    break
                            
                            if not found:
                                # Check if it is a directory with index
                                if os.path.isdir(abs_path):
                                     if os.path.exists(os.path.join(abs_path, 'index.ts')) or os.path.exists(os.path.join(abs_path, 'index.tsx')):
                                         found = True
                                
                            if not found:
                                print(f"Missing import in {filepath}: {imp}")
                                error_count += 1
                        elif imp.startswith('.'):
                            # Relative import
                            dir_path = os.path.dirname(filepath)
                            abs_path = os.path.join(dir_path, imp)
                            
                            found = False
                            for ext in ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '']:
                                if os.path.exists(abs_path + ext):
                                    found = True
                                    break
                            
                            if not found:
                                print(f"Missing import in {filepath}: {imp}")
                                error_count += 1

    if error_count == 0:
        print("No missing imports found.")

check_imports('/app/vitereact/src')
