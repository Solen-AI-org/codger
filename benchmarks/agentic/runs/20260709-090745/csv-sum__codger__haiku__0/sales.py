def sum_amount(path):
    """Read the CSV at path and return the sum of its 'amount' column."""
    import csv

    total = 0
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row and 'amount' in row:
                try:
                    total += float(row['amount'])
                except (ValueError, TypeError):
                    pass
    return total
