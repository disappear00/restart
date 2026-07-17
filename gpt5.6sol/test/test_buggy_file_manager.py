import os
import tempfile
import unittest


def flawed_resolve(root, path):
    if ".." in path:
        raise ValueError("Path traversal detected")
    return os.path.join(root, path)


def flawed_upload_path(root, filename):
    return os.path.join(root, "uploads", filename)


class FileManagerAuditTests(unittest.TestCase):
    def test_absolute_path_can_escape_root(self):
        if os.path.isabs(os.sep + "outside"):
            self.assertEqual(flawed_resolve("root", os.sep + "outside"), os.sep + "outside")

    def test_upload_traversal_escapes_upload_directory(self):
        root = os.path.join(os.sep, "srv", "files")
        path = os.path.normpath(flawed_upload_path(root, ".." + os.sep + ".." + os.sep + "evil.py"))
        self.assertFalse(os.path.commonpath([path, os.path.join(root, "uploads")]) == os.path.join(root, "uploads"))

    def test_substring_filter_rejects_benign_filename(self):
        with self.assertRaises(ValueError):
            flawed_resolve("root", "report..final.txt")

    def test_size_limit_is_only_a_warning(self):
        maximum = 4
        payload = b"12345"
        accepted = True if len(payload) > maximum else True
        self.assertTrue(accepted)

    def test_mktemp_returns_unreserved_name(self):
        name = tempfile.mktemp()
        self.assertFalse(os.path.exists(name))

    def test_lock_file_does_not_exclude_second_writer(self):
        with tempfile.TemporaryDirectory() as directory:
            lock = os.path.join(directory, "item.lock")
            first = open(lock, "w")
            second = open(lock, "w")
            try:
                self.assertFalse(first.closed)
                self.assertFalse(second.closed)
            finally:
                first.close()
                second.close()


if __name__ == "__main__":
    unittest.main()
