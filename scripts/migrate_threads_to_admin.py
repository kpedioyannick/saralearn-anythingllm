#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migre les threads de cours (subchapterSlug IS NOT NULL) vers l'admin.
À lancer APRÈS init_sara_admin.py.

Idempotent : safe à relancer.

Usage :
  python3 scripts/migrate_threads_to_admin.py
  python3 scripts/migrate_threads_to_admin.py --dry-run
"""

import sys
import json
import argparse
import sqlite3
from pathlib import Path

SERVER_DIR = Path(__file__).parent.parent / "server"
DB_PATH    = SERVER_DIR / "storage" / "anythingllm.db"
CONFIG     = SERVER_DIR / "sara.config.json"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    # Lire admin_id
    config = json.loads(CONFIG.read_text())
    admin_id = config.get("admin_id")
    if not admin_id:
        print("✗ admin_id non défini dans sara.config.json — lance d'abord init_sara_admin.py", file=sys.stderr)
        sys.exit(1)

    if not DB_PATH.exists():
        print(f"✗ Base de données introuvable : {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))

    # Compter les threads à migrer
    cur = conn.execute(
        "SELECT COUNT(*) FROM workspace_threads "
        "WHERE slug IS NOT NULL AND user_id != ?",
        (admin_id,),
    )
    count = cur.fetchone()[0]
    print(f"Threads à migrer vers admin (id={admin_id}) : {count}")

    if count == 0:
        print("✓ Rien à faire.")
        conn.close()
        return

    if args.dry_run:
        print("[DRY] Aucune modification effectuée.")
        conn.close()
        return

    conn.execute(
        "UPDATE workspace_threads SET user_id = ? "
        "WHERE slug IS NOT NULL AND user_id != ?",
        (admin_id, admin_id),
    )
    conn.commit()
    print(f"✅ {count} threads migrés vers l'admin.")
    conn.close()


if __name__ == "__main__":
    main()
