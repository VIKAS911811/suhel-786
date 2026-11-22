import {
  BillDeductions,
  MeasurementGroup,
  MeasurementItem,
  MeasurementType,
} from '../types';

/**
 * Standard density of mild steel in g/cm3 (7.85 kg/dm3 or 7850 kg/m3)
 */
export const STEEL_DENSITY = 7.85;

/**
 * Normalizes length to meters based on typical civil/structural units:
 * If value > 30, it is assumed to be in millimeters (e.g. 1500mm -> 1.5m).
 * If value <= 30, it is assumed to be in meters (e.g. 6m).
 */
export function normalizeDimensionToMeters(val?: number): number {
  if (!val || val <= 0) return 0;
  return val > 30 ? val / 1000 : val;
}

/**
 * Calculate weight (in KG) and quantity metrics based on measurement type
 */
export function calculateItemWeightAndMetrics(item: Partial<MeasurementItem>): {
  calculatedKg: number;
  mtr: number;
  sqm: number;
  sqft: number;
  amount: number;
} {
  const qty = item.quantity || 1;
  const rate = item.rate || 0;
  const type: MeasurementType = item.measurementType || 'Plate';

  const lenMtr = normalizeDimensionToMeters(item.length);
  const widthMtr = normalizeDimensionToMeters(item.width);
  const thicknessMm = item.thickness || 0;
  const diameterMm = item.diameter || 0;
  const unitWeight = item.unitWeight || 0;

  let calculatedKg = 0;
  let mtr = 0;
  let sqm = 0;
  let sqft = 0;

  switch (type) {
    case 'Plate': {
      // Weight (kg) = Length(m) * Width(m) * Thickness(mm) * 7.85 * Qty
      sqm = lenMtr * widthMtr * qty;
      sqft = sqm * 10.7639;
      if (lenMtr > 0 && widthMtr > 0 && thicknessMm > 0) {
        calculatedKg = lenMtr * widthMtr * thicknessMm * STEEL_DENSITY * qty;
      } else if (unitWeight > 0) {
        calculatedKg = (lenMtr > 0 ? lenMtr : 1) * unitWeight * qty;
      }
      break;
    }

    case 'Structural Section': {
      // Weight (kg) = Length(m) * UnitWeight(kg/m) * Qty
      mtr = lenMtr * qty;
      calculatedKg = lenMtr > 0 ? mtr * unitWeight : qty * unitWeight;
      break;
    }

    case 'TMT': {
      // Standard Formula: (d^2 / 162) kg/m * Length(m) * Qty
      const tmtUnitWeight = diameterMm > 0 ? (diameterMm * diameterMm) / 162 : unitWeight;
      mtr = lenMtr * qty;
      calculatedKg = mtr * tmtUnitWeight;
      break;
    }

    case 'Pipe': {
      // Weight = (Outer Diameter - Thickness) * Thickness * 0.02466 * Length(m) * Qty
      mtr = lenMtr * qty;
      if (diameterMm > 0 && thicknessMm > 0) {
        calculatedKg = (diameterMm - thicknessMm) * thicknessMm * 0.02466 * lenMtr * qty;
      } else {
        calculatedKg = mtr * unitWeight;
      }
      break;
    }

    case 'Square Tube': {
      // Weight approx = (Side * 4 - 4 * Thickness) * Thickness * 0.00785 * Length(m) * Qty
      const sideMm = item.width || item.height || 0;
      mtr = lenMtr * qty;
      if (sideMm > 0 && thicknessMm > 0) {
        calculatedKg = (sideMm * 4 - 4 * thicknessMm) * thicknessMm * 0.00785 * lenMtr * qty;
      } else {
        calculatedKg = mtr * unitWeight;
      }
      break;
    }

    case 'Labour Muster': {
      // Labour Muster calculates wages directly
      const dailyWage = item.dailyWage || item.rate || 0;
      const otHours = item.otHours || 0;
      const hourlyRate = dailyWage / 8;
      let dayMultiplier = 1;
      if (item.halfDay) dayMultiplier = 0.5;
      else if (item.fullDay === false) dayMultiplier = 0;

      const musterAmount = dailyWage * dayMultiplier + otHours * hourlyRate * 1.5;
      return {
        calculatedKg: 0,
        mtr: 0,
        sqm: 0,
        sqft: 0,
        amount: Math.round(musterAmount * 100) / 100,
      };
    }

    case 'Custom':
    default: {
      if (unitWeight > 0) {
        calculatedKg = (lenMtr > 0 ? lenMtr : 1) * unitWeight * qty;
      } else if (item.kg && item.kg > 0) {
        calculatedKg = item.kg;
      }
      mtr = lenMtr * qty;
      sqm = lenMtr * widthMtr * qty;
      sqft = sqm * 10.7639;
      break;
    }
  }

  // Check manual override
  const finalKg = item.isManualKgOverride && item.manualKgValue !== undefined
    ? item.manualKgValue
    : Math.round(calculatedKg * 100) / 100;

  // Rate basis: default to item.rateBasis. If not specified, for structural items with calculated weight,
  // the rate is per KG (standard industrial practice). If rateBasis is explicitly NOS/PCS, amount = qty * rate.
  let amount = 0;
  const unitUpper = (item.unit || 'NOS').toUpperCase();
  const defaultBasis = finalKg > 0 && ['Plate', 'Structural Section', 'TMT', 'Square Tube', 'Pipe'].includes(type)
    ? 'KG'
    : (unitUpper === 'KG' || unitUpper === 'MT' ? unitUpper : unitUpper);
  const rateBasis = (item.rateBasis || defaultBasis).toUpperCase();

  if (rateBasis === 'KG') {
    amount = finalKg * rate;
  } else if (rateBasis === 'MT' || rateBasis === 'TON' || rateBasis === 'TONNE') {
    amount = (finalKg / 1000) * rate;
  } else if (rateBasis === 'MTR' || rateBasis === 'M') {
    amount = (mtr || qty) * rate;
  } else if (rateBasis === 'SQM') {
    amount = (sqm || qty) * rate;
  } else if (rateBasis === 'SQFT') {
    amount = (sqft || qty) * rate;
  } else {
    amount = qty * rate;
  }

  return {
    calculatedKg: Math.round(finalKg * 100) / 100,
    mtr: Math.round(mtr * 100) / 100,
    sqm: Math.round(sqm * 100) / 100,
    sqft: Math.round(sqft * 100) / 100,
    amount: Math.round(amount * 100) / 100,
  };
}

/**
 * Re-computes groups and totals
 */
export function recalculateGroups(groups: MeasurementGroup[]): {
  updatedGroups: MeasurementGroup[];
  grandTotalKg: number;
  grandTotalAmount: number;
} {
  let grandTotalKg = 0;
  let grandTotalAmount = 0;

  const updatedGroups = groups.map((grp) => {
    let groupKg = 0;
    let groupAmount = 0;

    const updatedItems = grp.items.map((item, idx) => {
      const metrics = calculateItemWeightAndMetrics(item);
      const effectiveKg = item.isManualKgOverride && item.manualKgValue !== undefined
        ? item.manualKgValue
        : metrics.calculatedKg;

      groupKg += effectiveKg;
      groupAmount += metrics.amount;

      return {
        ...item,
        slNo: idx + 1,
        kg: effectiveKg,
        mtr: metrics.mtr,
        sqm: metrics.sqm,
        sqft: metrics.sqft,
        amount: metrics.amount,
      };
    });

    grandTotalKg += groupKg;
    grandTotalAmount += groupAmount;

    return {
      ...grp,
      items: updatedItems,
      groupTotalKg: Math.round(groupKg * 100) / 100,
      groupTotalAmount: Math.round(groupAmount * 100) / 100,
    };
  });

  return {
    updatedGroups,
    grandTotalKg: Math.round(grandTotalKg * 100) / 100,
    grandTotalAmount: Math.round(grandTotalAmount * 100) / 100,
  };
}

/**
 * Computes Bill Deductions & Financials
 */
export function calculateBillDeductions(
  subtotal: number,
  deductionsInput: Partial<BillDeductions> = {}
): BillDeductions {
  const gstRate = deductionsInput.gstRate !== undefined ? deductionsInput.gstRate : 18;
  const otherCharges = deductionsInput.otherCharges || 0;

  const gstAmount = Math.round((subtotal * (gstRate / 100)) * 100) / 100;
  const grossBill = Math.round((subtotal + gstAmount + otherCharges) * 100) / 100;

  const tdsRate = deductionsInput.tdsRate !== undefined ? deductionsInput.tdsRate : 2;
  const tdsAmount = Math.round((subtotal * (tdsRate / 100)) * 100) / 100;

  const retentionRate = deductionsInput.retentionRate !== undefined ? deductionsInput.retentionRate : 5;
  const retentionAmount = Math.round((subtotal * (retentionRate / 100)) * 100) / 100;

  const advanceRecovery = deductionsInput.advanceRecovery || 0;
  const materialRecovery = deductionsInput.materialRecovery || 0;
  const otherDeduction = deductionsInput.otherDeduction || 0;

  const totalDeduction = Math.round(
    (tdsAmount + retentionAmount + advanceRecovery + materialRecovery + otherDeduction) * 100
  ) / 100;

  const netBill = Math.round((grossBill - totalDeduction) * 100) / 100;
  const amountReceived = deductionsInput.amountReceived || 0;
  const balanceAmount = Math.round((netBill - amountReceived) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    gstRate,
    gstAmount,
    otherCharges,
    grossBill,
    tdsRate,
    tdsAmount,
    retentionRate,
    retentionAmount,
    advanceRecovery,
    materialRecovery,
    otherDeduction,
    totalDeduction,
    netBill,
    amountReceived,
    balanceAmount,
  };
}

/**
 * Evaluates custom formula column expression safely
 */
export function evaluateCustomFormula(
  expression: string,
  variables: Record<string, number>
): number {
  if (!expression || typeof expression !== 'string') return 0;
  try {
    // Sanitized variable replacement
    let parsed = expression.toLowerCase();
    Object.keys(variables).forEach((vKey) => {
      const val = variables[vKey] || 0;
      const regex = new RegExp(`\\b${vKey.toLowerCase()}\\b`, 'g');
      parsed = parsed.replace(regex, val.toString());
    });

    // Strip unsafe characters (only allow digits, operators, parens, decimal, spaces)
    if (!/^[0-9+\-*/(). ]+$/.test(parsed)) {
      return 0;
    }

    // Evaluate basic arithmetic safely
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${parsed})`)();
    return typeof result === 'number' && !isNaN(result) && isFinite(result)
      ? Math.round(result * 100) / 100
      : 0;
  } catch {
    return 0;
  }
}
