import {Schema, SchemaType} from '@sanity/types'
import React, {useCallback} from 'react'
import {useSource} from '../../studio'
import {FormPreviewComponentResolver, FIXME} from '../types'
import {SanityPreview} from '../../preview'
import {FormBuilderProvider} from '../FormBuilderProvider'
import {PatchChannel} from '../patchChannel'
import {resolveInputComponent as defaultInputResolver} from './inputResolver/inputResolver'

const previewResolver: FormPreviewComponentResolver = (..._: unknown[]) => {
  // @todo: Implement correct typing here
  return SanityPreview as FIXME
}

/**
 * @alpha This API might change.
 */
export interface StudioFormBuilderProviderProps {
  /**
   * @internal Considered internal, do not use.
   */
  __internal_patchChannel: PatchChannel // eslint-disable-line camelcase
  children: React.ReactElement
  schema: Schema
  value: any | null
}

/**
 * Default wiring for `FormBuilderProvider` when used with Sanity
 *
 * @alpha This API might change.
 */
export function StudioFormBuilderProvider(props: StudioFormBuilderProviderProps) {
  const {__internal_patchChannel: patchChannel, children, schema, value} = props

  const {unstable_formBuilder: formBuilder} = useSource()

  const resolveInputComponent = useCallback(
    (type: SchemaType) => {
      return defaultInputResolver(
        formBuilder.components?.inputs,
        formBuilder.resolveInputComponent,
        type
      )
    },
    [formBuilder]
  )

  return (
    <FormBuilderProvider
      __internal_patchChannel={patchChannel}
      components={formBuilder.components}
      file={formBuilder.file}
      image={formBuilder.image}
      resolveInputComponent={resolveInputComponent}
      resolvePreviewComponent={formBuilder.resolvePreviewComponent || previewResolver}
      schema={schema}
      value={value}
    >
      {children}
    </FormBuilderProvider>
  )
}