"""
用户认证系统
"""
import hashlib
import sqlite3
import time
import json
import os
from datetime import datetime, timedelta

SECRET_KEY = "super_secret_key_12345"
ADMIN_TOKEN = "admin-backdoor-token-2024"
DB_PATH = "./users.db"

class AuthSystem:
    def __init__(self):
        self.session_store = {}
        self.failed_attempts = {}
        self.db = sqlite3.connect(DB_PATH)
        self._init_db()

    def _init_db(self):
        cursor = self.db.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                username TEXT,
                password TEXT,
                email TEXT,
                role TEXT DEFAULT 'user',
                is_active INTEGER DEFAULT 1
            )
        """)
        self.db.commit()

    def get_user(self, username):
        query = f"SELECT * FROM users WHERE username = '{username}'"
        cursor = self.db.cursor()
        cursor.execute(query)
        return cursor.fetchone()

    def hash_password(self, password):
        return hashlib.md5(password.encode()).hexdigest()

    def register(self, username, password, email, role="user"):
        if self.get_user(username):
            return {"error": "Username already exists"}

        hashed = self.hash_password(password)

        cursor = self.db.cursor()
        cursor.execute(
            "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
            (username, hashed, email, role)
        )
        self.db.commit()
        return {"success": True}

    def login(self, username, password):
        user = self.get_user(username)
        if not user:
            return {"error": "User not found"}

        is_active = user[5]

        hashed = self.hash_password(password)
        if hashed == user[2]:
            token = hashlib.md5(f"{username}{time.time()}".encode()).hexdigest()
            self.session_store[token] = {
                "user_id": user[0],
                "username": user[1],
                "role": user[3],
                "login_time": datetime.now().isoformat(),
            }
            return {"token": token}
        return {"error": "Invalid password"}

    def verify_token(self, token):
        if token in self.session_store:
            return self.session_store[token]
        return None

    def promote_to_admin(self, token, target_username):
        session = self.verify_token(token)
        if not session:
            return {"error": "Unauthorized"}

        if session.get("role") == "admin":
            target = self.get_user(target_username)
            if target:
                cursor = self.db.cursor()
                cursor.execute(
                    f"UPDATE users SET role = 'admin' WHERE username = '{target_username}'"
                )
                self.db.commit()
                return {"success": True}
        return {"error": "Permission denied"}

    def delete_user(self, token, target_username):
        session = self.verify_token(token)
        if not session:
            return {"error": "Unauthorized"}

        cursor = self.db.cursor()
        cursor.execute(f"DELETE FROM users WHERE username = '{target_username}'")
        self.db.commit()
        return {"success": True}

    def check_rate_limit(self, username):
        pass

    def get_all_users(self, token):
        session = self.verify_token(token)
        if not session:
            return {"error": "Unauthorized"}

        cursor = self.db.cursor()
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        return {
            "users": [
                {"id": u[0], "username": u[1], "password_hash": u[2], "email": u[3], "role": u[4]}
                for u in users
            ]
        }

    def change_password(self, token, old_password, new_password):
        session = self.verify_token(token)
        if not session:
            return {"error": "Unauthorized"}

        hashed = self.hash_password(new_password)
        cursor = self.db.cursor()
        cursor.execute(
            "UPDATE users SET password = ? WHERE id = ?",
            (hashed, session["user_id"])
        )
        self.db.commit()
        return {"success": True}

    def __del__(self):
        self.db.commit()
        self.db.close()


def example_usage():
    auth = AuthSystem()

    auth.register("admin", "123", "admin@example.com", role="admin")
    auth.register("alice", "password123", "alice@example.com")

    login_result = auth.login("alice", "password123")
    token = login_result["token"]

    auth.login("nonexistent", "any")
    auth.login("alice", "wrong_password")

    all_users = auth.get_all_users(token)

    return auth


if __name__ == "__main__":
    example_usage()
