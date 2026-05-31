import { useEffect, useMemo, useState } from 'react';
import { Download, Home, IndianRupee, ReceiptText } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { Bill, Profile, Tenant } from '../types';
import { currency, monthLabel } from '../utils/billCalculator';

type Props = { profile: Profile };

export default function TenantDashboard({ profile }: Props) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [message, setMessage] = useState('');

  async function loadData() {
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .or(`user_id.eq.${profile.id},email.eq.${profile.email}`)
      .maybeSingle();

    setTenant(tenantData as Tenant | null);

    if (tenantData) {
      const { data: billsData } = await supabase
        .from('bills')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .order('bill_month', { ascending: false });
      setBills((billsData ?? []) as Bill[]);
    }
  }

  useEffect(() => {
    loadData();
  }, [profile.id]);

  const currentBill = bills[0];
  const totals = useMemo(() => ({
    pending: bills.filter((bill) => bill.payment_status === 'pending').reduce((sum, bill) => sum + Number(bill.total_amount), 0),
    paid: bills.filter((bill) => bill.payment_status === 'paid').length,
  }), [bills]);

  async function markPaid(id: string) {
    const { error } = await supabase.from('bills').update({ payment_status: 'paid' }).eq('id', id);
    if (error) setMessage(error.message);
    else {
      setMessage('Payment marked as done.');
      loadData();
    }
  }

  if (!tenant) {
    return (
      <div className="panel">
        <h2 className="text-2xl font-bold">Tenant profile not linked</h2>
        <p className="mt-2 text-slate-600">
          Ask the owner to add your tenant record using this email: <strong>{profile.email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <p className="text-sm text-slate-500">Room {tenant.room_no}</p>
        <h2 className="text-2xl font-bold">Welcome, {tenant.name}</h2>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="stat"><span><Home size={20} /></span><p>Monthly rent</p><strong>{currency(tenant.rent)}</strong></div>
        <div className="stat"><span><IndianRupee size={20} /></span><p>Pending amount</p><strong>{currency(totals.pending)}</strong></div>
        <div className="stat"><span><ReceiptText size={20} /></span><p>Paid bills</p><strong>{totals.paid}</strong></div>
      </section>

      {currentBill ? (
        <section className="panel print-area">
          <div className="panel-heading">
            <div>
              <p className="text-sm text-slate-500">{monthLabel(currentBill.bill_month)}</p>
              <h3>Current bill</h3>
            </div>
            <button className="primary-button no-print" onClick={() => window.print()}><Download size={17} />Download PDF</button>
          </div>

          <div className="bill-grid">
            <Line label="Previous reading" value={currentBill.previous_reading} />
            <Line label="Current reading" value={currentBill.current_reading} />
            <Line label="Units used" value={currentBill.units_used} />
            <Line label="Rate" value={currency(currentBill.rate)} />
            <Line label="Electricity" value={currency(currentBill.electricity_charge)} />
            <Line label="Well bill" value={currency(currentBill.well_bill)} />
            <Line label="Rent" value={currency(currentBill.rent)} />
            <Line label="Total payable" value={currency(currentBill.total_amount)} strong />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-4">
            <span className={`status ${currentBill.payment_status}`}>{currentBill.payment_status}</span>
            {currentBill.payment_status === 'pending' && (
              <button className="primary-button no-print" onClick={() => markPaid(currentBill.id)}>Mark payment done</button>
            )}
          </div>
        </section>
      ) : (
        <section className="panel">
          <h3>No bill generated yet</h3>
          <p className="mt-2 text-slate-600">Your owner has not generated a bill for this account.</p>
        </section>
      )}

      {message && <p className="rounded-lg bg-white p-3 text-sm text-slate-700 shadow-soft">{message}</p>}

      <section className="panel overflow-hidden">
        <div className="panel-heading"><h3>Payment history</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Month</th><th>Units</th><th>Rent</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td>{monthLabel(bill.bill_month)}</td>
                  <td>{bill.units_used}</td>
                  <td>{currency(bill.rent)}</td>
                  <td>{currency(bill.total_amount)}</td>
                  <td><span className={`status ${bill.payment_status}`}>{bill.payment_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className={strong ? 'bill-line strong' : 'bill-line'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
