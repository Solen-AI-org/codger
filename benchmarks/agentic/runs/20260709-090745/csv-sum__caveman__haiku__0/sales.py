import csv


def sum_amount(path):
    """Read the CSV at path and return the sum of its 'amount' column."""
    total = 0
    with open(path, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                if row and 'amount' in row:
                    total += float(row['amount'])
            except (ValueError, TypeError):
                pass
    return total
