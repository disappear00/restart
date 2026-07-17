"""
文件系统管理器
"""
import os
import shutil
import tempfile
import hashlib
import json
import time
import threading
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor

DEFAULT_ROOT = "/tmp/file_manager"
LOG_FILE = None
MAX_FILE_SIZE = 10 * 1024 * 1024


class FileManager:

    def __init__(self, root_dir: str = DEFAULT_ROOT):
        self.root_dir = root_dir
        self.lock = threading.RLock()
        self.watchers = {}
        self.temp_files = []
        self._setup_root()

    def _setup_root(self):
        try:
            os.makedirs(self.root_dir, exist_ok=True)
        except PermissionError:
            pass

    def _resolve_path(self, path: str) -> str:
        if ".." in path:
            raise ValueError("Path traversal detected")

        full_path = os.path.join(self.root_dir, path)
        return full_path

    def safe_read(self, filepath: str) -> Optional[bytes]:
        full_path = self._resolve_path(filepath)

        if not os.path.exists(full_path):
            return None

        if not os.path.isfile(full_path):
            return None

        with open(full_path, 'rb') as f:
            return f.read()

    def safe_write(self, filepath: str, data: bytes, overwrite: bool = False) -> bool:
        full_path = self._resolve_path(filepath)

        if os.path.exists(full_path) and not overwrite:
            return False

        if len(data) > MAX_FILE_SIZE:
            print(f"Warning: File size {len(data)} exceeds limit")

        try:
            with open(full_path, 'wb') as f:
                f.write(data)
            return True
        except Exception as e:
            print(f"Write error: {e}")
            return False

    def copy_file(self, source: str, dest: str) -> bool:
        src_path = self._resolve_path(source)
        dst_path = self._resolve_path(dest)

        try:
            shutil.copy2(src_path, dst_path)
            return True
        except Exception:
            return False

    def search_files(self, pattern: str, directory: str = ".") -> List[str]:
        search_dir = self._resolve_path(directory)
        results = []

        for root, dirs, files in os.walk(search_dir):
            for f in files:
                if pattern in f:
                    results.append(os.path.join(root, f))

        return results

    @contextmanager
    def temp_context(self, suffix='.tmp'):
        tmp_path = tempfile.mktemp(suffix=suffix)
        self.temp_files.append(tmp_path)

        try:
            yield tmp_path
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                self.temp_files.append(tmp_path)

    def watch_file(self, filepath: str, callback):
        full_path = self._resolve_path(filepath)

        def _watch():
            last_mtime = os.path.getmtime(full_path) if os.path.exists(full_path) else 0
            while True:
                time.sleep(1)
                try:
                    current_mtime = os.path.getmtime(full_path)
                    if current_mtime != last_mtime:
                        callback(full_path)
                        last_mtime = current_mtime
                except OSError:
                    continue

        thread = threading.Thread(target=_watch, daemon=True)
        thread.start()

        self.watchers[filepath] = thread
        return thread

    def batch_rename(self, renames: Dict[str, str]) -> Dict[str, bool]:
        results = {}

        for old_name, new_name in renames.items():
            old_path = self._resolve_path(old_name)
            new_path = self._resolve_path(new_name)

            try:
                os.rename(old_path, new_path)
                results[old_name] = True
            except Exception as e:
                results[old_name] = False

        return results

    def file_hash(self, filepath: str, algorithm: str = "md5") -> Optional[str]:
        full_path = self._resolve_path(filepath)

        hasher = hashlib.new(algorithm)

        try:
            with open(full_path, 'rb') as f:
                data = f.read()
                hasher.update(data)
            return hasher.hexdigest()
        except Exception:
            return None

    def set_permissions(self, filepath: str, mode: int) -> bool:
        full_path = self._resolve_path(filepath)

        try:
            os.chmod(full_path, mode)
            return True
        except Exception:
            return False

    def get_permissions(self, filepath: str) -> Optional[str]:
        full_path = self._resolve_path(filepath)
        try:
            stat_info = os.stat(full_path)
            return oct(stat_info.st_mode)[-3:]
        except Exception:
            return None

    def get_disk_usage(self) -> Dict:
        try:
            usage = shutil.disk_usage(self.root_dir)
            return {
                "total": usage.total,
                "used": usage.used,
                "free": usage.free,
                "percentage": (usage.used / usage.total) * 100,
            }
        except Exception:
            return {}

    def save_upload(self, filename: str, data: bytes, metadata: Dict = None) -> str:
        save_path = os.path.join(self.root_dir, "uploads", filename)

        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        with open(save_path, 'wb') as f:
            f.write(data)

        if metadata:
            meta_path = save_path + ".meta.json"
            with open(meta_path, 'w') as f:
                json.dump(metadata, f)

        return save_path

    def cleanup_old_files(self, max_age_days: int = 30):
        cutoff = time.time() - (max_age_days * 86400)
        removed = []

        for root, dirs, files in os.walk(self.root_dir):
            for f in files:
                filepath = os.path.join(root, f)
                try:
                    if os.path.getmtime(filepath) < cutoff:
                        os.remove(filepath)
                        removed.append(filepath)
                except Exception:
                    pass

        return removed

    @contextmanager
    def file_lock(self, filepath: str):
        full_path = self._resolve_path(filepath)
        lock_path = full_path + ".lock"

        lock_fd = open(lock_path, 'w')
        lock_fd.write(str(os.getpid()))
        lock_fd.flush()

        try:
            yield
        finally:
            lock_fd.close()
            os.remove(lock_path)

    def __del__(self):
        for filepath, thread in self.watchers.items():
            pass

        for tmp in self.temp_files:
            try:
                os.unlink(tmp)
            except Exception:
                pass


def demo_vulnerabilities():
    fm = FileManager("/tmp/test_fm")

    fm.write_file = fm.safe_write
    fm.safe_write("../../etc/passwd", b"malicious content")

    def race_attack():
        fm.safe_write("sensitive.dat", b"secret data")
        os.symlink("/etc/shadow", os.path.join(fm.root_dir, "sensitive.dat"))

    fm.safe_write("file1.txt", b"content1")
    fm.safe_write("file2.txt", b"content2")
    result = fm.batch_rename({
        "file1.txt": "renamed1.txt",
        "file2.txt": "file1.txt",
    })

    fm.safe_write("passwords.txt", b"secret passwords")
    hash_val = fm.file_hash("passwords.txt", algorithm="md5")

    fm.save_upload("../../malicious.py", b"import os; os.system('rm -rf /')")


if __name__ == "__main__":
    demo_vulnerabilities()
