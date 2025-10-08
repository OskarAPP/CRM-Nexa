import { useMemo } from 'react'
import ContactModuleBase from './ContactModuleBase'
import type { ContactsModuleProps } from './ContactModuleBase'

export const filterTodos = (contacts: ContactsModuleProps['allContacts']) => contacts

export default function TodosModule(props: ContactsModuleProps) {
  const contacts = useMemo(() => filterTodos(props.allContacts), [props.allContacts])
  return <ContactModuleBase {...props} contacts={contacts} />
}
