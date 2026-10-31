import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import { CUSTOMER_STATUSES } from '../../utils/constants.js';
import { titleCase } from '../../utils/format.js';

export const blankCustomer = {
  name: '',
  email: '',
  phone: '',
  companyName: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  gstNumber: '',
  status: 'ACTIVE',
};

export function customerToForm(customer) {
  return {
    name: customer.name ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    companyName: customer.company_name ?? '',
    address: customer.address ?? '',
    city: customer.city ?? '',
    state: customer.state ?? '',
    country: customer.country ?? 'India',
    gstNumber: customer.gst_number ?? '',
    status: customer.status ?? 'ACTIVE',
  };
}

export function formToCustomer(form) {
  return {
    ...form,
    phone: form.phone || null,
    companyName: form.companyName || null,
    address: form.address || null,
    city: form.city || null,
    state: form.state || null,
    gstNumber: form.gstNumber || null,
  };
}

export default function CustomerFormFields({ value, onChange }) {
  const update = (field) => (event) => onChange({ ...value, [field]: event.target.value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Full name" required value={value.name} onChange={update('name')} />
      <Input label="Email" type="email" required value={value.email} onChange={update('email')} />
      <Input label="Phone" value={value.phone} onChange={update('phone')} />
      <Input label="Company" value={value.companyName} onChange={update('companyName')} />
      <Textarea
        label="Address"
        value={value.address}
        onChange={update('address')}
        rows={2}
        containerClassName="sm:col-span-2"
      />
      <Input label="City" value={value.city} onChange={update('city')} />
      <Input label="State" value={value.state} onChange={update('state')} />
      <Input label="Country" value={value.country} onChange={update('country')} />
      <Input label="GST number" value={value.gstNumber} onChange={update('gstNumber')} />
      <Select
        label="Status"
        value={value.status}
        onChange={update('status')}
        options={CUSTOMER_STATUSES.map((status) => ({
          value: status,
          label: titleCase(status),
        }))}
      />
    </div>
  );
}
