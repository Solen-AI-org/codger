import csv

def sum_amount(path):
    """Read the CSV at path and return the sum of its 'amount' column."""
    total = 0
    with open(path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                amount = row['amount']
                total += float(amount)
            except (KeyError, ValueError, TypeError):
                continue
    return total
