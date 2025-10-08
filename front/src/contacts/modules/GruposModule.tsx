import { useMemo } from 'react'
import ContactModuleBase from './ContactModuleBase'
import type { ContactsModuleProps } from './ContactModuleBase'

export const filterGroups = (contacts: ContactsModuleProps['allContacts']) =>
  contacts.filter((contact) => contact.remoteJid?.includes('@g.us'))

export default function GruposModule(props: ContactsModuleProps) {
  const contacts = useMemo(() => filterGroups(props.allContacts), [props.allContacts])
  return <ContactModuleBase {...props} contacts={contacts} />
}
