import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRightLeft,
  CheckCircle2,
  Download,
  Mail,
  Pencil,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import DetailList from '../../components/ui/DetailList.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DocumentLines from '../../components/documents/DocumentLines.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import useAsync from '../../hooks/useAsync.js';
import {
  convertQuotation,
  deleteQuotation,
  downloadQuotationPdf,
  getQuotation,
  sendQuotation,
  updateQuotationStatus,
} from '../../api/quotations.api.js';
import { formatDate, formatDateTime, todayInputValue, addDaysInputValue } from '../../utils/format.js';

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === 'ADMIN' ? '/admin' : '/staff';
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => getQuotation(id), [id]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({
    startDate: todayInputValue(),
    expiryDate: addDaysInputValue(365),
    paymentTermsDays: 30,
    notes: '',
  });
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');

  if (loading && !data) {
    return <Spinner label="Loading quotation…" />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={reload} />;
  }

  if (!data) {
    return null;
  }

  const runAction = async (key, action, successMessage) => {
    setBusy(key);
    setActionError('');

    try {
      const result = await action();
      toast.success(result?.message ?? successMessage);
      await reload();
      return result;
    } catch (requestError) {
      setActionError(requestError.message);
      return null;
    } finally {
      setBusy('');
    }
  };

  const download = async () => {
    try {
      await downloadQuotationPdf(data);
    } catch (requestError) {
      toast.error(requestError.message);
    }
  };

  const sendEmail = async (event) => {
    event.preventDefault();
    const result = await runAction(
      'send',
      () => sendQuotation(data.id, { message: emailMessage || null }),
      'Quotation emailed.',
    );

    if (result) {
      setEmailOpen(false);
      setEmailMessage('');
    }
  };

  const convert = async (event) => {
    event.preventDefault();
    const result = await runAction(
      'convert',
      () =>
        convertQuotation(data.id, {
          startDate: convertForm.startDate,
          expiryDate: convertForm.expiryDate,
          paymentTermsDays: Number(convertForm.paymentTermsDays || 30),
          notes: convertForm.notes || null,
        }),
      'Quotation converted.',
    );

    if (result?.subscription?.id) {
      setConvertOpen(false);
      navigate(`${base}/subscriptions/${result.subscription.id}`);
    }
  };

  const remove = async () => {
    const approved = await confirm({
      title: `Delete ${data.quotation_number}?`,
      message: 'Only draft quotations can be deleted. This cannot be undone.',
      confirmLabel: 'Delete quotation',
    });

    if (!approved) {
      return;
    }

    const result = await runAction('delete', () => deleteQuotation(data.id), 'Quotation deleted.');

    if (result) {
      navigate(`${base}/quotations`);
    }
  };

  const canSend = !['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(data.status);
  const canConvert = data.status === 'ACCEPTED' && !data.subscription_id;

  return (
    <div>
      <PageHeader
        title={data.quotation_number}
        description={data.header_text || 'Subscription quotation'}
        breadcrumbs={[
          { label: 'Quotations', to: `${base}/quotations` },
          { label: data.quotation_number },
        ]}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={download}>PDF</Button>
            {canSend ? (
              <Button variant="secondary" icon={Mail} onClick={() => setEmailOpen(true)}>Email</Button>
            ) : null}
            {data.status === 'DRAFT' ? (
              <>
                <Link to={`${base}/quotations/${data.id}/edit`}>
                  <Button variant="secondary" icon={Pencil}>Edit</Button>
                </Link>
                <Button
                  icon={Send}
                  loading={busy === 'sent'}
                  onClick={() =>
                    runAction('sent', () => updateQuotationStatus(data.id, 'SENT'), 'Quotation marked as sent.')
                  }
                >
                  Mark sent
                </Button>
              </>
            ) : null}
            {data.status === 'SENT' ? (
              <>
                <Button
                  icon={CheckCircle2}
                  loading={busy === 'accepted'}
                  onClick={() =>
                    runAction('accepted', () => updateQuotationStatus(data.id, 'ACCEPTED'), 'Quotation accepted.')
                  }
                >
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  icon={XCircle}
                  loading={busy === 'rejected'}
                  onClick={() =>
                    runAction('rejected', () => updateQuotationStatus(data.id, 'REJECTED'), 'Quotation rejected.')
                  }
                >
                  Reject
                </Button>
              </>
            ) : null}
            {canConvert ? (
              <Button icon={ArrowRightLeft} onClick={() => setConvertOpen(true)}>Convert</Button>
            ) : null}
            {data.status === 'DRAFT' ? (
              <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete quotation">
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            ) : null}
          </>
        }
      />

      {actionError ? <Alert tone="error" className="mb-4">{actionError}</Alert> : null}

      {data.subscription_id ? (
        <Alert tone="success" className="mb-4">
          Converted to{' '}
          <Link to={`${base}/subscriptions/${data.subscription_id}`} className="font-semibold underline">
            {data.subscription_number}
          </Link>
          .
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Customer" actions={<Badge status={data.status} />} />
          <CardBody>
            <DetailList
              columns={1}
              items={[
                { label: 'Name', value: data.customer_name },
                { label: 'Company', value: data.company_name || '—' },
                { label: 'Email', value: data.customer_email },
                {
                  label: 'Address',
                  value:
                    [data.customer_address, data.customer_city, data.customer_state, data.customer_country]
                      .filter(Boolean)
                      .join(', ') || '—',
                },
                { label: 'GSTIN', value: data.customer_gst_number || '—' },
              ]}
            />
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Quotation details" />
          <CardBody>
            <DetailList
              columns={2}
              items={[
                { label: 'Template', value: data.template_name || '—' },
                { label: 'Prepared by', value: data.created_by_name || '—' },
                { label: 'Created', value: formatDate(data.created_at) },
                { label: 'Valid until', value: formatDate(data.valid_until) },
                { label: 'Sent', value: data.sent_at ? formatDateTime(data.sent_at) : 'Not sent' },
                {
                  label: 'Accepted',
                  value: data.accepted_at ? formatDateTime(data.accepted_at) : data.rejected_at ? 'Rejected' : '—',
                },
                { label: 'Subscription', value: data.subscription_number || 'Not converted' },
                { label: 'Currency', value: data.currency },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Line items" description="Prices exclude taxes unless shown on each line." />
        <CardBody className="p-0">
          <DocumentLines lines={data.lines ?? []} totals={data} currency={data.currency} showPlan />
        </CardBody>
      </Card>

      {data.notes ? (
        <Card className="mt-6">
          <CardHeader title="Notes" />
          <CardBody>
            <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{data.notes}</p>
          </CardBody>
        </Card>
      ) : null}

      {data.terms_text ? (
        <Card className="mt-6">
          <CardHeader title="Terms" />
          <CardBody>
            <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{data.terms_text}</p>
          </CardBody>
        </Card>
      ) : null}

      <Modal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title="Email quotation"
        description={`Send ${data.quotation_number} to ${data.customer_email} with the PDF attached.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button form="quotation-email-form" type="submit" loading={busy === 'send'} icon={Mail}>
              Send email
            </Button>
          </>
        }
      >
        <form id="quotation-email-form" onSubmit={sendEmail}>
          <Textarea
            label="Message"
            rows={4}
            value={emailMessage}
            onChange={(event) => setEmailMessage(event.target.value)}
            placeholder="Add an optional note to the customer…"
          />
        </form>
      </Modal>

      <Modal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convert to subscription"
        description="Create a subscription from this accepted quotation."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button form="quotation-convert-form" type="submit" loading={busy === 'convert'} icon={ArrowRightLeft}>
              Convert quotation
            </Button>
          </>
        }
      >
        <form id="quotation-convert-form" onSubmit={convert} className="space-y-4">
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              required
              value={convertForm.startDate}
              onChange={(event) => setConvertForm((c) => ({ ...c, startDate: event.target.value }))}
            />
            <Input
              label="Expiry date"
              type="date"
              value={convertForm.expiryDate}
              onChange={(event) => setConvertForm((c) => ({ ...c, expiryDate: event.target.value }))}
            />
            <Input
              label="Payment terms (days)"
              type="number"
              min="0"
              max="365"
              value={convertForm.paymentTermsDays}
              onChange={(event) => setConvertForm((c) => ({ ...c, paymentTermsDays: event.target.value }))}
            />
            <Textarea
              label="Notes"
              rows={2}
              value={convertForm.notes}
              onChange={(event) => setConvertForm((c) => ({ ...c, notes: event.target.value }))}
              containerClassName="sm:col-span-2"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
