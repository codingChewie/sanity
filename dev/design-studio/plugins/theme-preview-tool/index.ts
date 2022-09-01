import {createPlugin} from 'sanity'
import {IceCreamIcon} from '@sanity/icons'
import {ColorCanvas} from './ColorCanvas'

export function themePreviewTool() {
  return createPlugin({
    name: 'design-studio/theme-preview-tool',
    tools: [
      {
        icon: IceCreamIcon,
        name: 'theme-preview',
        title: 'Theme preview',
        component: ColorCanvas,
        options: {},
      },
    ],
  })
}