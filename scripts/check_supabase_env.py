#!/usr/bin/env python3
import os,sys
required=['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY']
missing=[k for k in required if not os.getenv(k)]
if missing:
 print('Supabase env CHECK: missing', ', '.join(missing))
 sys.exit(1)
print('Supabase env CHECK PASS')
