import ContactModuleBase from './ContactModuleBase'
import type { ContactsModuleProps } from './ContactModuleBase'

export default function TodosModule(props: ContactsModuleProps) {
  return <ContactModuleBase {...props} />
}
