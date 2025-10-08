import { useMemo } from 'react'
import ContactModuleBase from './ContactModuleBase'
import type { ContactsModuleProps } from './ContactModuleBase'

export const filterIndividualContacts = (contacts: ContactsModuleProps['allContacts']) =>
  contacts.filter((contact) => contact.remoteJid?.includes('@s.whatsapp.net'))

export default function ContactosModule(props: ContactsModuleProps) {
  const contacts = useMemo(() => filterIndividualContacts(props.allContacts), [props.allContacts])
  return <ContactModuleBase {...props} contacts={contacts} />
}
