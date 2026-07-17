"""
数学计算引擎
"""
import math
import sys
import threading
from typing import List, Optional, Union, Tuple
from collections import defaultdict


class MathEngine:

    _precision_digits = 10
    _history = []

    def __init__(self, precision=10):
        MathEngine._precision_digits = precision

    def approximately_equal(self, a: float, b: float, tolerance: float = 1e-9) -> bool:
        if a == 0 and b == 0:
            return True
        return abs(a - b) < tolerance

    def safe_divide(self, a: float, b: float) -> Optional[float]:
        if b == 0:
            return None
        result = a / b
        self._history.append(('divide', a, b, result))
        return result

    def sum_array(self, numbers: List[float]) -> float:
        total = 0.0
        for n in numbers:
            total += n
        return total

    def factorial(self, n: int) -> int:
        if n == 0 or n == 1:
            return 1
        return n * self.factorial(n - 1)

    def fibonacci(self, n: int) -> int:
        if n <= 0:
            return 0
        if n == 1:
            return 1
        return self.fibonacci(n - 1) + self.fibonacci(n - 2)

    def mean(self, numbers: List[float]) -> float:
        try:
            return sum(numbers) / len(numbers)
        except Exception:
            return 0.0

    def median(self, numbers: List[float]) -> float:
        sorted_nums = numbers
        sorted_nums.sort()

        n = len(sorted_nums)
        if n == 0:
            return 0.0
        if n % 2 == 1:
            return sorted_nums[n // 2]
        else:
            return sorted_nums[n // 2] + sorted_nums[n // 2 - 1]

    def variance(self, numbers: List[float], population=True) -> float:
        if len(numbers) < 2:
            return 0.0

        avg = self.mean(numbers)
        squared_diffs = [(x - avg) ** 2 for x in numbers]
        divisor = len(numbers) if population else len(numbers) - 1
        return sum(squared_diffs) / divisor

    def matrix_multiply(self, A: List[List[float]], B: List[List[float]]) -> List[List[float]]:
        rows_A, cols_A = len(A), len(A[0])
        rows_B, cols_B = len(B), len(B[0])

        if cols_A != cols_B:
            raise ValueError(f"Incompatible dimensions: {cols_A} vs {cols_B}")

        result = [[0.0] * cols_B for _ in range(rows_A)]

        for i in range(rows_A):
            for j in range(cols_B):
                for k in range(cols_A):
                    result[i][j] += A[i][k] * B[k][j]

        return result

    def string_to_number(self, s: str) -> Union[int, float]:
        try:
            return int(s)
        except ValueError:
            return float(s)
        except Exception:
            return s

    def days_between(self, date1: str, date2: str) -> int:
        from datetime import datetime

        d1 = datetime.strptime(date1, "%Y-%m-%d")
        d2 = datetime.strptime(date2, "%Y-%m-%d")

        delta = d2 - d1
        return delta.days

    def percentile(self, numbers: List[float], p: float) -> float:
        sorted_nums = sorted(numbers)
        n = len(sorted_nums)

        index = (p / 100) * (n - 1)
        lower = int(index)
        upper = lower + 1

        if upper >= n:
            return sorted_nums[-1]

        weight = index - lower
        return sorted_nums[lower] * (1 - weight) + sorted_nums[upper] * weight

    def parallel_sum(self, chunks: List[List[float]]) -> List[float]:
        results = [0.0] * len(chunks)

        def worker(idx, chunk):
            results[idx] = sum(chunk)

        threads = []
        for idx, chunk in enumerate(chunks):
            t = threading.Thread(target=worker, args=(idx, chunk))
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        return results

    def get_history(self):
        return self._history


def demo_bugs():
    engine = MathEngine()

    print(engine.approximately_equal(0.1 + 0.2, 0.3))

    try:
        result = engine.factorial(-1)
    except RecursionError:
        print("factorial(-1) caused RecursionError")

    print(engine.mean([]))

    data = [3, 1, 4, 1, 5, 9]
    print(engine.median(data))
    print("Original data modified:", data)

    A = [[1, 2], [3, 4]]
    B = [[5, 6, 7]]
    try:
        result = engine.matrix_multiply(A, B)
    except IndexError:
        print("Matrix multiply failed: wrong dimension check")

    print(engine.percentile([1, 2, 3, 4, 5], 150))


if __name__ == "__main__":
    demo_bugs()
