import {createConfig} from 'sanity'
import {deskTool} from 'sanity/desk'
import {MyLogo} from './components/MyLogo'
import {schema} from './schema'

export default createConfig({
  name: 'default', // @todo remove
  projectId: 'aeysrmym',
  dataset: 'production',
  plugins: [deskTool()],
  logo: MyLogo,
  schema,
})