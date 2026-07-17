import unittest


def flawed_median(numbers):
    sorted_nums = numbers
    sorted_nums.sort()
    n = len(sorted_nums)
    if n == 0:
        return 0.0
    if n % 2:
        return sorted_nums[n // 2]
    return sorted_nums[n // 2] + sorted_nums[n // 2 - 1]


def flawed_matrix_check(a, b):
    return len(a[0]) == len(b[0])


def flawed_percentile(numbers, p):
    values = sorted(numbers)
    index = (p / 100) * (len(values) - 1)
    lower = int(index)
    upper = lower + 1
    if upper >= len(values):
        return values[-1]
    weight = index - lower
    return values[lower] * (1 - weight) + values[upper] * weight


class MathAuditTests(unittest.TestCase):
    def test_even_median_is_not_averaged(self):
        self.assertEqual(flawed_median([1, 3]), 4)

    def test_median_mutates_caller_list(self):
        values = [3, 1, 2]
        flawed_median(values)
        self.assertEqual(values, [1, 2, 3])

    def test_matrix_dimension_check_uses_wrong_axis(self):
        self.assertFalse(flawed_matrix_check([[1, 2]], [[1], [2]]))

    def test_out_of_range_percentile_is_accepted(self):
        self.assertEqual(flawed_percentile([1, 2, 3], 150), 3)

    def test_empty_percentile_crashes(self):
        with self.assertRaises(IndexError):
            flawed_percentile([], 50)

    def test_float_conversion_error_escapes_original_except_chain(self):
        def convert(value):
            try:
                return int(value)
            except ValueError:
                return float(value)
            except Exception:
                return value
        with self.assertRaises(ValueError):
            convert("not-a-number")


if __name__ == "__main__":
    unittest.main()
