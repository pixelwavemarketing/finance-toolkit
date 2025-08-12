// ---------------------------------------------
// COMPUTE ENGINES
// ---------------------------------------------
import { toNum, clamp, monthAdd } from './utils.js';

export function computeCompoundInterest(input){
  const P = toNum(input.principal);
  const C = toNum(input.contrib);
  const r = toNum(input.rate) / 100; // annual
  const years = clamp(toNum(input.years), 1, 100);
  const compound = input.compound || 'monthly';

  const periodsPerYear = compound === 'annual' ? 1 : (compound === 'quarterly' ? 4 : (compound === 'monthly' ? 12 : 365));
  const dtMonths = 12; // timeline sampling monthly

  let balance = P;
  const timeline = [];
  const start = new Date();
  let totalContrib = 0;

  for (let m=1; m<=years*12; m++){
    // contribution monthly
    balance += C; 
    totalContrib += C;
    // compound within month using effective monthly rate derived from selected compounding
    // annual: (1+r)^(1/12)-1, monthly: r/12, daily: (1+r/365)^(365/12)-1
    const monthlyRate = Math.pow(1 + (r / periodsPerYear), periodsPerYear / 12) - 1;
    balance *= (1 + monthlyRate);
    if (m % dtMonths === 0){
      const year = Math.floor(m/12);
      timeline.push({ 
        year, 
        balance: +balance.toFixed(2), 
        date: monthAdd(start, m) 
      });
    }
  }
  
  const finalBalance = +balance.toFixed(2);
  const totalGrowth = +(finalBalance - P - totalContrib).toFixed(2);
  return { finalBalance, totalContrib, totalGrowth, timeline };
}

export function computeDebtPayoff(input){
  const strategy = input.strategy || 'snowball';
  const extra = Math.max(0, toNum(input.extra));
  let debts = Array.isArray(input.debts) ? input.debts.map(d=>({
    name: d.name || 'Debt', 
    balance: Math.max(0,toNum(d.balance)), 
    apr: Math.max(0,toNum(d.apr)), 
    min: Math.max(0,toNum(d.min))
  })) : [];
  
  debts = debts.filter(d=>d.balance>0);
  if (!debts.length) {
    return { 
      months:0, 
      totalInterest:0, 
      debtFreeDate:'—', 
      schedule:[], 
      timeline:[] 
    };
  }

  const schedule = []; // per month snapshot
  let month = 0; 
  let totalInterest = 0;
  const start = new Date();

  // Prevent infinite loop
  let safety = 0; 
  const SAFETY_LIMIT = 3600; // 300 years

  while (debts.some(d=>d.balance>0) && safety++ < SAFETY_LIMIT){
    month++;
    
    // Accrue interest
    for (const d of debts){
      if (d.balance<=0) continue;
      const monthlyRate = d.apr/100/12;
      const interest = d.balance * monthlyRate;
      d.balance += interest; 
      totalInterest += interest;
    }
    
    // Determine payment order
    let active = debts.filter(d=>d.balance>0);
    if (strategy==='snowball') {
      active.sort((a,b)=>a.balance-b.balance);
    } else {
      active.sort((a,b)=>b.apr-a.apr);
    }

    // Apply minimums
    let pool = extra + active.reduce((s,d)=>s + Math.min(d.min, d.balance), 0);
    for (const d of active){
      if (d.balance<=0) continue;
      const pay = Math.min(d.min, d.balance, pool);
      d.balance -= pay; 
      pool -= pay;
    }
    
    // Roll remaining pool to the target debt
    active = debts.filter(d=>d.balance>0);
    if (active.length){
      if (strategy==='snowball') {
        active.sort((a,b)=>a.balance-b.balance);
      } else {
        active.sort((a,b)=>b.apr-a.apr);
      }
      let i=0;
      while (pool>0 && i<active.length){
        const d = active[i];
        const pay = Math.min(d.balance, pool);
        d.balance -= pay; 
        pool -= pay; 
        if (d.balance<=0) i++;
      }
    }

    schedule.push({ 
      month, 
      debts: debts.map(d=>({ 
        name:d.name, 
        balance:+d.balance.toFixed(2) 
      })), 
      totalBalance: +debts.reduce((s,d)=>s+d.balance,0).toFixed(2) 
    });

    if (debts.every(d=>d.balance<=0)) break;
    if (month>6000) break; // absolute hard stop
  }

  const debtFreeDate = monthAdd(start, month).toLocaleDateString();
  const timeline = schedule.map(s=>({ 
    month:s.month, 
    totalBalance:s.totalBalance 
  }));
  
  return { 
    months: month, 
    totalInterest: +totalInterest.toFixed(2), 
    debtFreeDate, 
    schedule, 
    timeline 
  };
}

export function computeEmergencyFund(input) {
  const monthlyExpenses = toNum(input.monthlyExpenses);
  const monthsBuffer = toNum(input.monthsBuffer);
  const currentSaved = toNum(input.currentSaved);
  const monthlySavings = toNum(input.monthlySavings);
  const annualRate = toNum(input.interestRate) / 100;
  const monthlyRate = annualRate / 12;
  
  // Calculate targets
  const targetAmount = monthlyExpenses * monthsBuffer;
  const stillNeeded = Math.max(0, targetAmount - currentSaved);
  
  // Calculate sinking funds
  const categories = Array.isArray(input.categories) ? input.categories : [];
  const totalSinkingFunds = categories.reduce((sum, cat) => {
    return sum + toNum(cat.target);
  }, 0);
  
  // Build timeline
  const timeline = [];
  let balance = currentSaved;
  let month = 0;
  
  // If already at target, show current state
  if (stillNeeded <= 0) {
    timeline.push({ month: 0, emergencyBalance: balance });
    return {
      targetAmount: +targetAmount.toFixed(2),
      stillNeeded: 0,
      monthsToGoal: 0,
      totalSinkingFunds: +totalSinkingFunds.toFixed(2),
      timeline
    };
  }
  
  // Build monthly progression
  while (balance < targetAmount && month < 600) { // 50 year limit
    month++;
    
    // Add monthly savings
    balance += monthlySavings;
    
    // Add interest (compound monthly)
    if (monthlyRate > 0) {
      balance *= (1 + monthlyRate);
    }
    
    // Track every month for first year, then every 3 months
    if (month <= 12 || month % 3 === 0) {
      timeline.push({ 
        month, 
        emergencyBalance: +balance.toFixed(2) 
      });
    }
    
    // Stop when target reached
    if (balance >= targetAmount) break;
  }
  
  const monthsToGoal = monthlySavings > 0 ? month : 999;
  
  return {
    targetAmount: +targetAmount.toFixed(2),
    stillNeeded: +Math.max(0, stillNeeded).toFixed(2),
    monthsToGoal,
    totalSinkingFunds: +totalSinkingFunds.toFixed(2),
    timeline
  };
}

export function computeSavingsRate(input) {
  const netIncome = toNum(input.netIncome);
  const monthlyExpenses = toNum(input.monthlyExpenses);
  const currentInvestments = toNum(input.currentInvestments);
  const annualReturn = toNum(input.annualReturn) / 100;
  const withdrawalRate = toNum(input.withdrawalRate) / 100;
  
  // Calculate savings rate
  const monthlySavings = Math.max(0, netIncome - monthlyExpenses);
  const savingsRate = netIncome > 0 ? (monthlySavings / netIncome) * 100 : 0;
  
  // Calculate FI target (annual expenses / withdrawal rate)
  const annualExpenses = monthlyExpenses * 12;
  const targetPortfolio = withdrawalRate > 0 ? annualExpenses / withdrawalRate : 0;
  
  // Calculate timeline
  const timeline = [];
  let portfolio = currentInvestments;
  let year = 0;
  const monthlyReturn = annualReturn / 12;
  
  // If already at FI target
  if (portfolio >= targetPortfolio && targetPortfolio > 0) {
    timeline.push({ year: 0, portfolio: portfolio });
    return {
      savingsRate: +savingsRate.toFixed(1),
      yearsToFI: 0,
      targetPortfolio: +targetPortfolio.toFixed(2),
      monthlySavings: +monthlySavings.toFixed(2),
      timeline
    };
  }
  
  // Build timeline (monthly calculations, yearly reporting)
  while (portfolio < targetPortfolio && year < 100) { // 100 year limit
    for (let month = 0; month < 12; month++) {
      // Add monthly savings
      portfolio += monthlySavings;
      
      // Apply monthly return
      if (monthlyReturn > 0) {
        portfolio *= (1 + monthlyReturn);
      }
    }
    
    year++;
    timeline.push({ 
      year, 
      portfolio: +portfolio.toFixed(2) 
    });
    
    // Stop when target reached
    if (portfolio >= targetPortfolio) break;
  }
  
  const yearsToFI = monthlySavings > 0 ? year : 999;
  
  return {
    savingsRate: +savingsRate.toFixed(1),
    yearsToFI,
    targetPortfolio: +targetPortfolio.toFixed(2),
    monthlySavings: +monthlySavings.toFixed(2),
    timeline
  };
}

export function computeGoalTimeline(input) {
  const targetAmount = toNum(input.targetAmount);
  const startAmount = toNum(input.startAmount);
  const monthlyContribution = toNum(input.monthlyContribution);
  const annualReturn = toNum(input.annualReturn) / 100;
  const monthlyReturn = annualReturn / 12;
  const stepUpEnabled = input.stepUpEnabled === 'true';
  const stepUpAmount = toNum(input.stepUpAmount);
  const stepUpFrequency = Math.max(1, toNum(input.stepUpFrequency));
  
  if (targetAmount <= 0) {
    return {
      monthsToGoal: 0,
      goalDate: new Date().toLocaleDateString(),
      totalContributions: 0,
      totalGrowth: 0,
      timeline: []
    };
  }
  
  // If already at goal
  if (startAmount >= targetAmount) {
    return {
      monthsToGoal: 0,
      goalDate: new Date().toLocaleDateString(),
      totalContributions: 0,
      totalGrowth: 0,
      timeline: [{ month: 0, balance: startAmount }]
    };
  }
  
  const timeline = [];
  let balance = startAmount;
  let month = 0;
  let totalContributions = 0;
  let currentMonthlyContrib = monthlyContribution;
  const startDate = new Date();
  
  timeline.push({ month: 0, balance: +balance.toFixed(2) });
  
  while (balance < targetAmount && month < 1200) { // 100 year limit
    month++;
    
    // Apply step-up if enabled
    if (stepUpEnabled && month > 0 && month % stepUpFrequency === 0) {
      currentMonthlyContrib += stepUpAmount;
    }
    
    // Add monthly contribution
    balance += currentMonthlyContrib;
    totalContributions += currentMonthlyContrib;
    
    // Apply monthly return
    if (monthlyReturn > 0) {
      balance *= (1 + monthlyReturn);
    }
    
    // Track monthly for first year, then every 3 months
    if (month <= 12 || month % 3 === 0) {
      timeline.push({ 
        month, 
        balance: +balance.toFixed(2) 
      });
    }
    
    // Stop when target reached
    if (balance >= targetAmount) break;
  }
  
  const goalDate = monthAdd(startDate, month).toLocaleDateString();
  const totalGrowth = +(balance - startAmount - totalContributions).toFixed(2);
  
  return {
    monthsToGoal: month,
    goalDate,
    totalContributions: +totalContributions.toFixed(2),
    totalGrowth: Math.max(0, totalGrowth),
    timeline
  };
}

export function computeRefinanceBreakeven(input) {
  const currentBalance = toNum(input.currentBalance);
  const currentAPR = toNum(input.currentAPR) / 100;
  const currentTermMonths = toNum(input.currentTermMonths);
  const newAPR = toNum(input.newAPR) / 100;
  const newTermMonths = toNum(input.newTermMonths);
  const closingCosts = toNum(input.closingCosts);
  
  if (currentBalance <= 0) {
    return {
      breakevenMonths: 0,
      monthlySavings: 0,
      lifetimeInterestSaved: 0,
      netBenefit: 0,
      timeline: []
    };
  }
  
  // Calculate monthly payments
  function calculateMonthlyPayment(principal, rate, months) {
    if (rate === 0) return principal / months;
    const monthlyRate = rate / 12;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
           (Math.pow(1 + monthlyRate, months) - 1);
  }
  
  const currentPayment = calculateMonthlyPayment(currentBalance, currentAPR, currentTermMonths);
  const newPayment = calculateMonthlyPayment(currentBalance, newAPR, newTermMonths);
  const monthlySavings = currentPayment - newPayment;
  
  // Calculate total interest for each loan
  const currentTotalInterest = (currentPayment * currentTermMonths) - currentBalance;
  const newTotalInterest = (newPayment * newTermMonths) - currentBalance;
  const lifetimeInterestSaved = currentTotalInterest - newTotalInterest;
  const netBenefit = lifetimeInterestSaved - closingCosts;
  
  // Calculate break-even time
  const breakevenMonths = monthlySavings > 0 ? Math.ceil(closingCosts / monthlySavings) : 999;
  
  // Build timeline
  const timeline = [];
  let cumulativeSavings = -closingCosts; // Start with negative closing costs
  
  for (let month = 0; month <= Math.min(240, Math.max(currentTermMonths, newTermMonths)); month++) {
    if (month > 0) {
      cumulativeSavings += monthlySavings;
    }
    
    if (month === 0 || month % 6 === 0 || month <= 24) {
      timeline.push({
        month,
        cumulativeSavings: +cumulativeSavings.toFixed(2)
      });
    }
  }
  
  return {
    breakevenMonths: Math.min(breakevenMonths, 999),
    monthlySavings: +monthlySavings.toFixed(2),
    lifetimeInterestSaved: +lifetimeInterestSaved.toFixed(2),
    netBenefit: +netBenefit.toFixed(2),
    timeline
  };
}

export function computeBudgetSplitter(input) {
  const takeHomePay = toNum(input.takeHomePay);
  const needsPercent = toNum(input.needsPercent);
  const wantsPercent = toNum(input.wantsPercent);
  const savingsPercent = toNum(input.savingsPercent);
  const payFrequency = input.payFrequency || 'monthly';
  
  // Calculate amounts
  const needsAmount = (takeHomePay * needsPercent) / 100;
  const wantsAmount = (takeHomePay * wantsPercent) / 100;
  const savingsAmount = (takeHomePay * savingsPercent) / 100;
  const totalPercent = needsPercent + wantsPercent + savingsPercent;
  
  // Convert to different pay frequencies for display
  // Use standard conversions: 52 pay periods/year, 26 bi-weekly periods/year
  // Monthly → Weekly: ÷ 4.333, Monthly → Bi-weekly: ÷ 2.167 (approx 26/12)
  const WEEKS_PER_MONTH = 52 / 12; // ~4.3333
  const BIWEEKS_PER_MONTH = 26 / 12; // ~2.1667
  const frequencies = {
    weekly: { multiplier: 1 / WEEKS_PER_MONTH, label: 'Weekly' },
    biweekly: { multiplier: 1 / BIWEEKS_PER_MONTH, label: 'Bi-weekly' },
    monthly: { multiplier: 1, label: 'Monthly' }
  };
  
  const freq = frequencies[payFrequency] || frequencies.monthly;
  
  // Create timeline data for chart (show breakdown)
  const timeline = [
    { category: 'Needs', amount: +(needsAmount * freq.multiplier).toFixed(2) },
    { category: 'Wants', amount: +(wantsAmount * freq.multiplier).toFixed(2) },
    { category: 'Savings', amount: +(savingsAmount * freq.multiplier).toFixed(2) }
  ];
  
  return {
    needsAmount: +(needsAmount * freq.multiplier).toFixed(2),
    wantsAmount: +(wantsAmount * freq.multiplier).toFixed(2),
    savingsAmount: +(savingsAmount * freq.multiplier).toFixed(2),
    totalPercent: +totalPercent.toFixed(1),
    timeline
  };
}

export function computeExtraPayment(input) {
  const loanBalance = toNum(input.loanBalance);
  const apr = toNum(input.apr) / 100;
  const remainingMonths = toNum(input.remainingMonths);
  const extraPayment = toNum(input.extraPayment);
  const paymentType = input.paymentType || 'monthly';
  
  if (loanBalance <= 0 || remainingMonths <= 0) {
    return {
      monthsSaved: 0,
      interestSaved: 0,
      newPayoffDate: new Date().toLocaleDateString(),
      totalSavings: 0,
      timeline: []
    };
  }
  
  // Calculate original monthly payment
  function calculateMonthlyPayment(principal, rate, months) {
    if (rate === 0) return principal / months;
    const monthlyRate = rate / 12;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
           (Math.pow(1 + monthlyRate, months) - 1);
  }
  
  const originalPayment = calculateMonthlyPayment(loanBalance, apr, remainingMonths);
  
  // Simulate original loan
  let originalBalance = loanBalance;
  let originalTotalInterest = 0;
  const monthlyRate = apr / 12;
  
  for (let month = 1; month <= remainingMonths; month++) {
    const interestPayment = originalBalance * monthlyRate;
    const principalPayment = originalPayment - interestPayment;
    originalBalance -= principalPayment;
    originalTotalInterest += interestPayment;
    if (originalBalance <= 0) break;
  }
  
  // Simulate loan with extra payments
  let newBalance = loanBalance;
  let newTotalInterest = 0;
  let month = 0;
  const timeline = [];
  const startDate = new Date();
  
  while (newBalance > 0 && month < 600) { // 50 year limit
    month++;
    
    const interestPayment = newBalance * monthlyRate;
    let principalPayment = originalPayment - interestPayment;
    
    // Add extra payment based on type
    let extraThisMonth = 0;
    if (paymentType === 'monthly') {
      extraThisMonth = extraPayment;
    } else if (paymentType === 'annual' && month % 12 === 0) {
      extraThisMonth = extraPayment;
    } else if (paymentType === 'onetime' && month === 1) {
      extraThisMonth = extraPayment;
    }
    
    principalPayment += extraThisMonth;
    
    // Don't overpay
    if (principalPayment > newBalance) {
      principalPayment = newBalance;
    }
    
    newBalance -= principalPayment;
    newTotalInterest += interestPayment;
    
    // Record timeline points
    if (month <= 12 || month % 6 === 0) {
      timeline.push({
        month,
        balance: +Math.max(0, newBalance).toFixed(2)
      });
    }
    
    if (newBalance <= 0) break;
  }
  
  const monthsSaved = remainingMonths - month;
  const interestSaved = originalTotalInterest - newTotalInterest;
  const newPayoffDate = monthAdd(startDate, month).toLocaleDateString();
  const totalSavings = interestSaved;
  
  return {
    monthsSaved: Math.max(0, monthsSaved),
    interestSaved: +Math.max(0, interestSaved).toFixed(2),
    newPayoffDate,
    totalSavings: +Math.max(0, totalSavings).toFixed(2),
    timeline
  };
}

export function computeCreditCardMinimum(input) {
  const balance = toNum(input.balance);
  const apr = toNum(input.apr) / 100;
  const minimumType = input.minimumType || 'percent';
  const minimumPercent = toNum(input.minimumPercent);
  const minimumFixed = toNum(input.minimumFixed);
  
  if (balance <= 0) {
    return {
      monthsToPayoff: 0,
      totalInterest: 0,
      totalPaid: balance,
      payoffDate: new Date().toLocaleDateString(),
      timeline: []
    };
  }
  
  let currentBalance = balance;
  let totalInterest = 0;
  let month = 0;
  const timeline = [];
  const startDate = new Date();
  const monthlyRate = apr / 12;
  
  while (currentBalance > 0 && month < 600) { // 50 year limit
    month++;
    
    // Calculate interest
    const interestCharge = currentBalance * monthlyRate;
    currentBalance += interestCharge;
    totalInterest += interestCharge;
    
    // Calculate minimum payment
    let minimumPayment;
    if (minimumType === 'percent') {
      minimumPayment = Math.max(minimumFixed, currentBalance * (minimumPercent / 100));
    } else {
      minimumPayment = minimumFixed;
    }
    
    // Don't overpay
    if (minimumPayment > currentBalance) {
      minimumPayment = currentBalance;
    }
    
    currentBalance -= minimumPayment;
    
    // Record timeline points
    if (month <= 12 || month % 6 === 0 || currentBalance <= 0) {
      timeline.push({
        month,
        balance: +Math.max(0, currentBalance).toFixed(2)
      });
    }
    
    if (currentBalance <= 0) break;
  }
  
  const payoffDate = monthAdd(startDate, month).toLocaleDateString();
  const totalPaid = balance + totalInterest;
  
  return {
    monthsToPayoff: month,
    totalInterest: +totalInterest.toFixed(2),
    totalPaid: +totalPaid.toFixed(2),
    payoffDate,
    timeline
  };
}

export function computeDebtToIncome(input) {
  const grossIncome = toNum(input.grossIncome);
  const housingPayment = toNum(input.housingPayment);
  const carPayments = toNum(input.carPayments);
  const creditCards = toNum(input.creditCards);
  const studentLoans = toNum(input.studentLoans);
  const otherDebts = toNum(input.otherDebts);
  
  if (grossIncome <= 0) {
    return {
      totalDTI: 0,
      housingDTI: 0,
      riskLevel: 'No income entered',
      maxAdditionalDebt: 0,
      timeline: []
    };
  }
  
  const totalDebtPayments = housingPayment + carPayments + creditCards + studentLoans + otherDebts;
  const totalDTI = (totalDebtPayments / grossIncome) * 100;
  const housingDTI = (housingPayment / grossIncome) * 100;
  
  // Determine risk level
  let riskLevel;
  if (totalDTI <= 36) {
    riskLevel = 'Good - Low Risk';
  } else if (totalDTI <= 41) {
    riskLevel = 'Acceptable - Moderate Risk';
  } else if (totalDTI <= 50) {
    riskLevel = 'High Risk - Reduce Debt';
  } else {
    riskLevel = 'Critical - Seek Help';
  }
  
  // Calculate max additional debt at 36% DTI
  const maxTotalDebt = grossIncome * 0.36;
  const maxAdditionalDebt = Math.max(0, maxTotalDebt - totalDebtPayments);
  
  // Create breakdown for chart
  const timeline = [
    { category: 'Housing', amount: housingPayment },
    { category: 'Car Payments', amount: carPayments },
    { category: 'Credit Cards', amount: creditCards },
    { category: 'Student Loans', amount: studentLoans },
    { category: 'Other Debts', amount: otherDebts }
  ].filter(item => item.amount > 0);
  
  return {
    totalDTI: +totalDTI.toFixed(1),
    housingDTI: +housingDTI.toFixed(1),
    riskLevel,
    maxAdditionalDebt: +maxAdditionalDebt.toFixed(2),
    timeline
  };
}
