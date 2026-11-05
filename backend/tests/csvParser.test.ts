import { parseRecipientsContent, isValidEmail } from '../src/utils/csvParser';

describe('CSV and TXT Recipient Parser', () => {
  test('validates email addresses correctly', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('john.doe+tag@reachinbox.ai')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
  });

  test('parses comma-separated values and handles headers', () => {
    const csvData = `Email,Name
alice@example.com,Alice
bob@example.com,Bob
invalid_address,Invalid
alice@example.com,Alice Duplicate`;

    const result = parseRecipientsContent(csvData);

    expect(result.validEmails).toEqual(['alice@example.com', 'bob@example.com']);
    expect(result.duplicateCount).toBe(1);
    expect(result.invalidCount).toBe(1); // 'invalid_address'
    expect(result.preview.length).toBe(2);
  });

  test('parses plain text newline-separated lists', () => {
    const txtData = `user1@reachinbox.test
user2@reachinbox.test
user3@reachinbox.test
user1@reachinbox.test`;

    const result = parseRecipientsContent(txtData);

    expect(result.validEmails.length).toBe(3);
    expect(result.duplicateCount).toBe(1);
    expect(result.invalidCount).toBe(0);
  });

  test('handles empty and whitespace content safely', () => {
    const result = parseRecipientsContent('   \n  \t ');
    expect(result.validEmails.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

