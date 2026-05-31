import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Download, IndianRupee, Plus, ReceiptText, Save, Trash2, UsersRound } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { Bill, Profile, Tenant } from '../types';
import { calculateBill, currency, monthLabel } from '../utils/billCalculator';

type Props = { profile: Profile };

type BillForm = {
  tenantId: string;
  billMonth: string;
  previousReading: string;
  currentReading: string;
  rate: string;
  wellBill: string;
};

const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

export default function AdminDashboard({ profile }: Props) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [tenantForm, setTenantForm] = useState({ name: '', room_no: '', rent: '', phone: '', email: '' });
  const [billForm, setBillForm] = useState<BillForm>({
    tenantId: '',
    billMonth: currentMonth,
    previousReading: '',
    currentReading: '',
    rate: '13.5',
    wellBill: '14.5',
  });
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function loadData() {
    const [{ data: tenantsData }, { data: billsData }] = await Promise.all([
      supabase.from('tenants').select('*').order('room_no'),
      supabase.from('bills').select('*, tenants(name, room_no, email)').order('bill_month', { ascending: false }),
    ]);

    setTenants((tenantsData ?? []) as Tenant[]);
    setBills((billsData ?? []) as Bill[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedTenant = tenants.find((tenant) => tenant.id === billForm.tenantId);
  const preview = selectedTenant
    ? calculateBill({
        previousReading: Number(billForm.previousReading || 0),
        currentReading: Number(billForm.currentReading || 0),
        rate: Number(billForm.rate || 0),
        wellBill: Number(billForm.wellBill || 0),
        rent: selectedTenant.rent,
      })
    : null;

  const stats = useMemo(() => {
    const pending = bills.filter((bill) => bill.payment_status === 'pending');
    return {
      tenants: tenants.filter((tenant) => tenant.is_active).length,
      totalRent: bills.reduce((sum, bill) => sum + Number(bill.rent), 0),
      pendingAmount: pending.reduce((sum, bill) => sum + Number(bill.total_amount), 0),
      currentRevenue: bills
        .filter((bill) => bill.bill_month === currentMonth)
        .reduce((sum, bill) => sum + Number(bill.total_amount), 0),
    };
  }, [tenants, bills]);

  async function saveTenant(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name: tenantForm.name,
      room_no: tenantForm.room_no,
      rent: Number(tenantForm.rent),
      phone: tenantForm.phone || null,
      email: tenantForm.email,
      is_active: true,
    };

    const response = editingTenantId
      ? await supabase.from('tenants').update(payload).eq('id', editingTenantId)
      : await supabase.from('tenants').insert(payload);

    if (response.error) {
      setMessage(response.error.message);
      return;
    }

    setTenantForm({ name: '', room_no: '', rent: '', phone: '', email: '' });
    setEditingTenantId(null);
    setMessage('Tenant saved.');
    loadData();
  }

  async function deleteTenant(id: string) {
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) setMessage(error.message);
    else loadData();
  }

  async function saveBill(event: FormEvent) {
    event.preventDefault();
    if (!selectedTenant) return;

    const { error } = await supabase.from('bills').upsert({
      tenant_id: selectedTenant.id,
      bill_month: billForm.billMonth,
      previous_reading: Number(billForm.previousReading),
      current_reading: Number(billForm.currentReading),
      rate: Number(billForm.rate),
      well_bill: Number(billForm.wellBill),
      rent: selectedTenant.rent,
      payment_status: 'pending',
    }, { onConflict: 'tenant_id,bill_month' });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Bill generated.');
    setBillForm((old) => ({ ...old, previousReading: '', currentReading: '' }));
    loadData();
  }

  async function updateStatus(id: string, payment_status: 'pending' | 'paid') {
    await supabase.from('bills').update({ payment_status }).eq('id', id);
    loadData();
  }

  function editTenant(tenant: Tenant) {
    setEditingTenantId(tenant.id);
    setTenantForm({
      name: tenant.name,
      room_no: tenant.room_no,
      rent: String(tenant.rent),
      phone: tenant.phone ?? '',
      email: tenant.email,
    });
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <p className="text-sm text-slate-500">Signed in as {profile.name}</p>
        <h2 className="text-2xl font-bold">Monthly rent and electricity</h2>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat icon={<UsersRound size={20} />} label="Tenants" value={String(stats.tenants)} />
        <Stat icon={<IndianRupee size={20} />} label="Total rent billed" value={currency(stats.totalRent)} />
        <Stat icon={<ReceiptText size={20} />} label="Pending amount" value={currency(stats.pendingAmount)} />
        <Stat icon={<Download size={20} />} label="This month" value={currency(stats.currentRevenue)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form className="panel" onSubmit={saveTenant}>
          <div className="panel-heading">
            <h3>{editingTenantId ? 'Edit tenant' : 'Add tenant'}</h3>
            <button className="primary-button" type="submit"><Save size={17} />Save</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" placeholder="Tenant name" value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} required />
            <input className="field" placeholder="Room no" value={tenantForm.room_no} onChange={(e) => setTenantForm({ ...tenantForm, room_no: e.target.value })} required />
            <input className="field" placeholder="Monthly rent" type="number" value={tenantForm.rent} onChange={(e) => setTenantForm({ ...tenantForm, rent: e.target.value })} required />
            <input className="field" placeholder="Phone" value={tenantForm.phone} onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })} />
            <input className="field sm:col-span-2" placeholder="Tenant login email" type="email" value={tenantForm.email} onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })} required />
          </div>
        </form>

        <form className="panel" onSubmit={saveBill}>
          <div className="panel-heading">
            <h3>Generate bill</h3>
            <button className="primary-button" type="submit"><Plus size={17} />Generate</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="field sm:col-span-2" value={billForm.tenantId} onChange={(e) => setBillForm({ ...billForm, tenantId: e.target.value })} required>
              <option value="">Select tenant</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.room_no} - {tenant.name}</option>)}
            </select>
            <input className="field" type="date" value={billForm.billMonth} onChange={(e) => setBillForm({ ...billForm, billMonth: e.target.value })} required />
            <input className="field" placeholder="Previous reading" type="number" value={billForm.previousReading} onChange={(e) => setBillForm({ ...billForm, previousReading: e.target.value })} required />
            <input className="field" placeholder="Current reading" type="number" value={billForm.currentReading} onChange={(e) => setBillForm({ ...billForm, currentReading: e.target.value })} required />
            <input className="field" placeholder="Rate" type="number" step="0.01" value={billForm.rate} onChange={(e) => setBillForm({ ...billForm, rate: e.target.value })} required />
            <input className="field" placeholder="Well bill" type="number" step="0.01" value={billForm.wellBill} onChange={(e) => setBillForm({ ...billForm, wellBill: e.target.value })} required />
          </div>
          {preview && (
            <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-4">
              <Mini label="Units" value={String(preview.unitsUsed)} />
              <Mini label="Electricity" value={currency(preview.electricityCharge)} />
              <Mini label="Rent" value={currency(selectedTenant?.rent ?? 0)} />
              <Mini label="Total" value={currency(preview.totalAmount)} />
            </div>
          )}
        </form>
      </section>

      {message && <p className="rounded-lg bg-white p-3 text-sm text-slate-700 shadow-soft">{message}</p>}

      <section className="panel overflow-hidden">
        <div className="panel-heading"><h3>Tenants</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Room</th><th>Name</th><th>Email</th><th>Rent</th><th></th></tr></thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>{tenant.room_no}</td><td>{tenant.name}</td><td>{tenant.email}</td><td>{currency(tenant.rent)}</td>
                  <td className="text-right">
                    <button className="text-button" onClick={() => editTenant(tenant)}>Edit</button>
                    <button className="icon-button danger" onClick={() => deleteTenant(tenant.id)} title="Remove tenant"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-heading"><h3>Bills</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Month</th><th>Tenant</th><th>Units</th><th>Bill</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td>{monthLabel(bill.bill_month)}</td><td>{bill.tenants?.name}</td><td>{bill.units_used}</td><td>{currency(bill.total_amount)}</td>
                  <td><span className={`status ${bill.payment_status}`}>{bill.payment_status}</span></td>
                  <td className="text-right">
                    <button className="text-button" onClick={() => updateStatus(bill.id, bill.payment_status === 'paid' ? 'pending' : 'paid')}>
                      Mark {bill.payment_status === 'paid' ? 'pending' : 'paid'}
                    </button>
                    <button className="icon-button" onClick={() => window.print()} title="Print bill"><Download size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="stat"><span>{icon}</span><p>{label}</p><strong>{value}</strong></div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><strong>{value}</strong></div>;
}
