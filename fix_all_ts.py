#!/usr/bin/env python3
import re
import sys

fixes = [
    # UV_AdminAnalytics.tsx
    ("/app/vitereact/src/components/views/UV_AdminAnalytics.tsx", [
        (r"^(\s*)const TransactionAnalytics.*?$", r"// \1TransactionAnalytics removed - unused", re.MULTILINE),
        (r"^(\s*)const SupplierAnalytics.*?$", r"// \1SupplierAnalytics removed - unused", re.MULTILINE),
        (r"^(\s*)const ProductAnalytics.*?$", r"// \1ProductAnalytics removed - unused", re.MULTILINE),
        (r"^(\s*)const OperationalAnalytics.*?$", r"// \1OperationalAnalytics removed - unused", re.MULTILINE),
    ]),
    # UV_AdminCommunication.tsx
    ("/app/vitereact/src/components/views/UV_AdminCommunication.tsx", [
        (r"const currentUser = useAppStore[^;]+;", r"// currentUser removed - unused"),
        (r", setSelectedCampaign", r""),
        (r"const \{ unreadCount, lastActivity \} = ", r"const { unreadCount } = "),
    ]),
]

for filepath, patterns in fixes:
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        for pattern, replacement, *flags in patterns:
            flag = flags[0] if flags else 0
            content = re.sub(pattern, replacement, content, flags=flag)
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    except Exception as e:
        print(f"Error fixing {filepath}: {e}")
