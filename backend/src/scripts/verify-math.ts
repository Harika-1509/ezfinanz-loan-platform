import { calculateLoanTerms, DEFAULT_RATE_CONFIG } from '../modules/loan-terms/loan-terms.calculator';

console.log('========================================================================================================');
console.log('                          EZFINANZ FINANCIAL MATHEMATICAL VERIFICATION ENGINE                           ');
console.log('========================================================================================================\n');

const testCases = [
  { amount: 100000, tenure: 6 },
  { amount: 300000, tenure: 12 },
  { amount: 400000, tenure: 24 },
  { amount: 500000, tenure: 24 },
  { amount: 1000000, tenure: 36 },
];

for (const tc of testCases) {
  const result = calculateLoanTerms({ amount: tc.amount, tenureMonths: tc.tenure });
  const cfg = DEFAULT_RATE_CONFIG[tc.tenure];
  
  console.log(`📌 CASE: Principal = ₹${tc.amount.toLocaleString('en-IN')}, Tenure = ${tc.tenure} Months (${tc.tenure >= 12 ? tc.tenure/12 + ' Yr' : tc.tenure + ' Mo'})`);
  console.log(`   - Base Interest Rate:       ${result.interestRate}% p.a.`);
  console.log(`   - Monthly Rate (r):         ${(result.interestRate / 1200).toFixed(6)}`);
  console.log(`   - Equated Monthly Inst (EMI): ₹${result.emi.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / mo`);
  console.log(`   - Processing Fee (${cfg.processingFeePercent}%):       ₹${result.processingFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`   - 18% GST on Fee:           ₹${result.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`   - Admin & Stamp Charges:    ₹${result.otherCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`   - Total Upfront Deductions: ₹${result.totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`   - Net Cash Disbursed:       ₹${result.netDisbursement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`   - Total Repayment (EMI * n): ₹${result.totalRepayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`   - Total Interest (Repay - P):₹${result.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`   - Effective Annual IRR:     ${result.irr}% p.a. (Newton-Raphson solved)`);
  
  // Mathematical Invariant Checks
  const deductionsMatch = Math.abs(result.totalCharges - (result.processingFee + result.gst + result.otherCharges)) < 0.01;
  const netDisbMatch = Math.abs(result.netDisbursement - (tc.amount - result.totalCharges)) < 0.01;
  const totalRepayMatch = Math.abs(result.totalRepayment - (result.emi * tc.tenure)) < 0.05;
  const interestMatch = Math.abs(result.totalInterest - (result.totalRepayment - tc.amount)) < 0.01;
  
  console.log(`   🔎 Mathematical Invariant Checks:`);
  console.log(`      ✓ Total Deductions Invariant (PF + GST + Charges == Deductions): ${deductionsMatch ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`      ✓ Net Disbursement Invariant (Principal - Deductions == Disbursed): ${netDisbMatch ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`      ✓ Repayment Invariant (EMI * n == Total Repayment): ${totalRepayMatch ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`      ✓ Interest Invariant (Total Repayment - Principal == Total Interest): ${interestMatch ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log('--------------------------------------------------------------------------------------------------------\n');
}
