import hashlib
import unittest


class AuthModel:
    """Minimal behavioral model copied from the audited authentication flow."""

    def __init__(self):
        self.users = {"alice": {"password": self.hash_password("pw"), "role": "user", "active": 0}}
        self.sessions = {"user-token": {"username": "alice", "role": "user"}}

    @staticmethod
    def hash_password(password):
        return hashlib.md5(password.encode()).hexdigest()

    def register(self, username, role="user"):
        self.users[username] = {"password": "", "role": role, "active": 1}

    def login(self, username, password):
        user = self.users[username]
        return user["password"] == self.hash_password(password)  # active is ignored

    def delete_user(self, token, username):
        if token in self.sessions:
            self.users.pop(username, None)

    def change_password(self, token, old_password, new_password):
        if token in self.sessions:
            self.users["alice"]["password"] = self.hash_password(new_password)


class AuthAuditTests(unittest.TestCase):
    def test_md5_password_hash_is_fast_and_unsalted(self):
        self.assertEqual(AuthModel.hash_password("pw"), AuthModel.hash_password("pw"))
        self.assertEqual(len(AuthModel.hash_password("pw")), 32)

    def test_caller_can_self_register_as_admin(self):
        auth = AuthModel()
        auth.register("mallory", role="admin")
        self.assertEqual(auth.users["mallory"]["role"], "admin")

    def test_inactive_user_can_login(self):
        self.assertTrue(AuthModel().login("alice", "pw"))

    def test_normal_user_can_delete_another_user(self):
        auth = AuthModel()
        auth.register("victim")
        auth.delete_user("user-token", "victim")
        self.assertNotIn("victim", auth.users)

    def test_old_password_is_not_checked(self):
        auth = AuthModel()
        auth.change_password("user-token", "wrong", "new")
        self.assertTrue(auth.login("alice", "new"))

    def test_interpolated_username_changes_query_structure(self):
        username = "' OR 1=1 --"
        query = f"SELECT * FROM users WHERE username = '{username}'"
        self.assertIn("OR 1=1", query)


if __name__ == "__main__":
    unittest.main()
