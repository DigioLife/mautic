import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Contact, ContactInput } from '../hooks/useContacts';

interface ContactFormModalProps {
  contact?: Contact | null;
  onClose: () => void;
  onSubmit: (input: ContactInput) => Promise<void>;
  isSubmitting: boolean;
}

const LIFECYCLE_STAGES = ['lead', 'mql', 'sql', 'customer', 'evangelist'];

export default function ContactFormModal({ contact, onClose, onSubmit, isSubmitting }: ContactFormModalProps) {
  const [form, setForm] = useState<ContactInput>({
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    company: contact?.company ?? '',
    jobTitle: contact?.jobTitle ?? '',
    lifecycleStage: contact?.lifecycleStage ?? 'lead',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.email && !form.phone) {
      setError('Enter at least an email or phone number.');
      return;
    }

    // Strip empty strings so we don't overwrite existing values with blanks,
    // and don't send an invalid empty email to the API's email() validator.
    const cleaned = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value !== '' && value !== undefined)
    );

    try {
      await onSubmit(cleaned);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Something went wrong');
    }
  };

  const field = (key: keyof ContactInput, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={(form[key] as string) ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{contact ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {field('firstName', 'First name')}
            {field('lastName', 'Last name')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('email', 'Email', 'email')}
            {field('phone', 'Phone')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('company', 'Company')}
            {field('jobTitle', 'Job title')}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lifecycle stage</label>
            <select
              value={form.lifecycleStage}
              onChange={(e) => setForm((f) => ({ ...f, lifecycleStage: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            >
              {LIFECYCLE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Saving…' : contact ? 'Save changes' : 'Add contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
