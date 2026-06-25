const TEST_DICTIONARY = require('./testDictionary');

function parseReportText(rawText) {
  // Split text into lines, remove empty ones
  const lines = rawText.split('\n').filter(line => line.trim() !== '');
  const results = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Step 1 — check if this line contains a known test name
    let matchedTest = null;
    for (const [key, testInfo] of Object.entries(TEST_DICTIONARY)) {
      if (testInfo.aliases.some(alias => lower.includes(alias))) {
        matchedTest = testInfo;
        break;
      }
    }

    // No known test found on this line — skip it
    if (!matchedTest) continue;

    // Step 2 — extract numeric value
    const valueMatch = line.match(/[\s\:\-=]\s*(\d+\.?\d*)/);
    if (!valueMatch) continue;
    const value = parseFloat(valueMatch[1]);

    // Step 3 — extract unit (word(s) right after the number)
    const unitMatch = line.match(/\d+\.?\d*\s*([a-zA-Z%µ\/]+(?:\/[a-zA-Zµ]+)?)/);
    const unit = unitMatch ? unitMatch[1] : matchedTest.typical_unit;

    // Step 4 — extract normal range if present
    // Handles formats like: (12.0 - 16.0) or 12-16 or Ref: 12.0-16.0
    const rangeMatch = line.match(
      /(?:normal|ref|reference|range)?[:\s]*(\d+\.?\d*)\s*[-–to]\s*(\d+\.?\d*)/i
    );
    const normalRangeLow  = rangeMatch ? parseFloat(rangeMatch[1]) : null;
    const normalRangeHigh = rangeMatch ? parseFloat(rangeMatch[2]) : null;

    // Step 5 — flag if outside normal range
    const isFlagged =
      (normalRangeLow !== null && value < normalRangeLow) ||
      (normalRangeHigh !== null && value > normalRangeHigh);

    results.push({
      test_name: matchedTest.canonical_name,
      value,
      unit,
      normal_range_low:  normalRangeLow,
      normal_range_high: normalRangeHigh,
      is_flagged: isFlagged,
      extraction_method: 'AUTO_REGEX'
    });
  }

  return results;
}

module.exports = { parseReportText };