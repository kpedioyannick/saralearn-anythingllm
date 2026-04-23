#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Initialise l'admin Sara :
  1. Vérifie si un admin existe déjà en DB
  2. Si non : crée l'admin (username + password, role=admin, bcrypt hash)
  3. Active multi_user_mode = "true" dans system_settings
  4. Écrit admin_id dans sara.config.json

Idempotent : safe à relancer.

Usage :
  python3 scripts/init_sara_admin.py --username admin --password <motdepasse>
  python3 scripts/init_sara_admin.py  # utilise les variables d'env SARA_ADMIN_USER / SARA_ADMIN_PASSWORD
"""

import os
import sys
import json
import argparse
import sqlite3
from pathlib import Path

import bcrypt

SERVER_DIR = Path(__file__).parent.parent / "server"
DB_PATH    = SERVER_DIR / "storage" / "anythingllm.db"
CONFIG     = SERVER_DIR / "sara.config.json"


def get_conn():
    if not DB_PATH.exists():
        print(f"✗ Base de données introuvable : {DB_PATH}", file=sys.stderr)
        sys.exit(1)
    return sqlite3.connect(str(DB_PATH))


def find_admin(conn) -> dict | None:
    cur = conn.execute("SELECT id, username FROM users WHERE role = 'admin' LIMIT 1")
    row = cur.fetchone()
    return {"id": row[0], "username": row[1]} if row else None


def create_admin(conn, username: str, password: str) -> int:
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    cur = conn.execute(
        "INSERT INTO users (username, password, role, suspended, createdAt, lastUpdatedAt) "
        "VALUES (?, ?, 'admin', 0, datetime('now'), datetime('now'))",
        (username, hashed),
    )
    conn.commit()
    return cur.lastrowid


def enable_multi_user(conn):
    existing = conn.execute(
        "SELECT id FROM system_settings WHERE label = 'multi_user_mode'"
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE system_settings SET value = 'true', lastUpdatedAt = datetime('now') "
            "WHERE label = 'multi_user_mode'"
        )
    else:
        conn.execute(
            "INSERT INTO system_settings (label, value, createdAt, lastUpdatedAt) "
            "VALUES ('multi_user_mode', 'true', datetime('now'), datetime('now'))"
        )
    conn.commit()


def update_config(admin_id: int):
    data = json.loads(CONFIG.read_text())
    data["admin_id"] = admin_id
    CONFIG.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", default=os.getenv("SARA_ADMIN_USER", "admin"))
    parser.add_argument("--password", default=os.getenv("SARA_ADMIN_PASSWORD"))
    args = parser.parse_args()

    if not args.password:
        print("✗ Mot de passe requis : --password ou variable SARA_ADMIN_PASSWORD", file=sys.stderr)
        sys.exit(1)

    conn = get_conn()

    # 1. Vérifier admin existant
    admin = find_admin(conn)
    if admin:
        print(f"✓ Admin déjà existant : {admin['username']} (id={admin['id']})")
        admin_id = admin["id"]
    else:
        admin_id = create_admin(conn, args.username, args.password)
        print(f"✓ Admin créé : {args.username} (id={admin_id})")

    # 2. Activer multi_user_mode
    enable_multi_user(conn)
    print("✓ multi_user_mode activé")

    # 3. Écrire admin_id dans sara.config.json
    update_config(admin_id)
    print(f"✓ sara.config.json mis à jour (admin_id={admin_id})")

    print("\n⚠  Redémarre le serveur AnythingLLM pour appliquer les changements.")

    conn.close()


if __name__ == "__main__":
    main()
