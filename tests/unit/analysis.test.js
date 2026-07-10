import { analyzeJob } from '../../analysis/scorer.js';

describe('Analysis Scorer (scorer.js)', () => {
  const baseJob = {
    id: 'test_job_1',
    title: 'React Developer Needed',
    description: 'We need a React developer for a long term project. Minimum 3 years experience.',
    budget: null,
    client: { totalSpentNumeric: 0, rating: 0 },
    skills: ['React', 'JavaScript'],
  };

  const userProfile = {
    skills: ['React', 'JavaScript', 'Node.js']
  };

  it('calculates perfect skill match', () => {
    const result = analyzeJob(baseJob, userProfile);
    expect(result.skillMatch.matchPercentage).toBe(100);
    expect(result.skillMatch.matched).toContain('React');
  });

  it('penalizes jobs with $0 spent and no rating', () => {
    const result = analyzeJob(baseJob, userProfile);
    // Should get low client score and possibly some red flags
    expect(result.clientAnalysis.score).toBeLessThan(50);
  });

  it('detects unverified payment method as a red flag', () => {
    const unverifiedJob = { ...baseJob, client: { ...baseJob.client, paymentVerified: false } };
    const result = analyzeJob(unverifiedJob, userProfile);
    // Red flags have auto-incremented IDs, so we check category instead
    const hasUnverifiedFlag = result.redFlags.some(flag => flag.category === 'client');
    expect(hasUnverifiedFlag).toBe(true);
  });

  it('gives high score for verified client with 5 stars and 10k+ spent', () => {
    const greatJob = {
      ...baseJob,
      budget: { type: 'fixed', value: 500 },
      client: { paymentVerified: true, totalSpentNumeric: 15000, rating: 4.9, hireRate: 85 }
    };
    const result = analyzeJob(greatJob, userProfile);
    expect(result.clientAnalysis.score).toBeGreaterThan(80);
    expect(result.overallScore).toBeGreaterThan(60); // Might still be less than 100 because budget is low
  });

  it('penalizes low fixed budgets below user minimum', () => {
    const lowBudgetJob = { ...baseJob, budget: { type: 'fixed', amount: 15 } };
    const profileWithMin = { ...userProfile, minimumFixedBudget: 100 };
    
    const result = analyzeJob(lowBudgetJob, profileWithMin);
    expect(result.budgetAnalysis.score).toBeLessThanOrEqual(30);
    expect(result.budgetAnalysis.details.some(d => d.includes('100'))).toBe(true);
  });
});
