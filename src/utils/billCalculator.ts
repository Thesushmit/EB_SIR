export type BillInput = {
  previousReading: number;
  currentReading: number;
  rate: number;
  wellBill: number;
  rent: number;
};

export type BillCalculation = {
  unitsUsed: number;
  electricityCharge: number;
  totalElectricity: number;
  totalAmount: number;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateBill(input: BillInput): BillCalculation {
  const unitsUsed = Math.max(0, input.currentReading - input.previousReading);
  const electricityCharge = money(unitsUsed * input.rate);
  const totalElectricity = money(electricityCharge + input.wellBill);

  return {
    unitsUsed: money(unitsUsed),
    electricityCharge,
    totalElectricity,
    totalAmount: money(totalElectricity + input.rent),
  };
}

export function currency(value: number | string) {
  const amount = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function monthLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
