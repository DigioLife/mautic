import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  useContactsList,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  Contact,
  ContactInput,
} from '../../hooks/useContacts';
import ContactFormModal from '../../components/ContactFormModal';
import { formatRelativeTime } from '../../lib/utils';

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700',
  mql: 'bg-blue-100 text-blue-700',
  sql: 'bg-purple-100 text-purple-700',
  customer: 'bg-green-100 text-green-700',
  evangelist: 'bg-amber-100 text-amber-700',
};

export default function ContactsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const { data, isLoading, isError } = useContactsList({ page, limit: 20, q: search || undefined });
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const openCreateModal = () => {
    setEditingContact(null);
    setModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setModalOpen(true);
  };

  const handleSubmit = async (input: ContactInput) => {
    if (editingContact) {
      await updateContact.mutateAsync({ id: editingContact.id, input });
      toast.success('Contact updated');
    } else {
      await createContact.mutateAsync(input);
      toast.success('Contact added');
    }
  };

  const handleDelete = async (contact: Contact) => {
    const label = contact.fullName || contact.email || contact.phone || 'this contact';
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;

    try {
      await deleteContact.mutateAsync(contact.id);
      toast.success('Contact deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete contact');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          {data && (
            <p className="text-gray-600 mt-1">
              {data.pagination.total} contact{data.pagination.total === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, phone, company…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            />
          </div>
        </div>

        {isLoading && <div className="p-12 text-center text-gray-500">Loading contacts…</div>}

        {isError && (
          <div className="p-12 text-center text-red-600">Failed to load contacts. Is the API running?</div>
        )}

        {!isLoading && !isError && data?.data.length === 0 && (
          <div className="p-16 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {search ? 'No contacts match your search.' : 'No contacts yet — add your first one.'}
            </p>
          </div>
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email / Phone</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium">Added</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {contact.fullName || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {contact.email || contact.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{contact.company || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            STAGE_COLORS[contact.lifecycleStage] || STAGE_COLORS.lead
                          }`}
                        >
                          {contact.lifecycleStage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatRelativeTime(contact.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(contact)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 transition"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(contact)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page >= data.pagination.totalPages}
                  className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <ContactFormModal
          contact={editingContact}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          isSubmitting={createContact.isPending || updateContact.isPending}
        />
      )}
    </div>
  );
}
