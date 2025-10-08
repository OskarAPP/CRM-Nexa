import ContactModuleBase from './ContactModuleBase'
import type { ContactsModuleProps } from './ContactModuleBase'

export default function GruposModule(props: ContactsModuleProps) {
  return <ContactModuleBase {...props} />
}
