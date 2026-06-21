import CrmContactsClient from './CrmContactsClient'

export default function CrmContactsPage() {
  return (
    <CrmContactsClient
      initialData={{ contacts: [], total: 0, totalPages: 1 }}
      loadOnMount
    />
  )
}
