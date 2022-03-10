import React, {useCallback} from 'react'
import {SanityPreview} from '@sanity/base/preview'
import {Schema, SchemaType} from '@sanity/types'
import {FormBuilderProvider, FormBuilderProviderProps} from '../FormBuilderProvider'
import {PatchChannel} from '../patchChannel'
import {FormPreviewComponentResolver} from '../types'
import {resolveInputComponent as defaultInputResolver} from './inputResolver/inputResolver'

const previewResolver: FormPreviewComponentResolver = (..._: unknown[]) => {
  // @todo: Implement correct typing here
  return SanityPreview as any
}

/**
 * @alpha This API might change.
 */
export interface SanityFormBuilderProviderProps {
  components?: FormBuilderProviderProps['components']
  value: any | null
  schema: Schema
  /**
   * @internal Considered internal, do not use.
   */
  __internal_patchChannel: PatchChannel // eslint-disable-line camelcase
  resolveInputComponent?: (type: SchemaType) => React.ComponentType<any> | null | undefined
  children: React.ReactElement
}

/**
 * Default wiring for `FormBuilderProvider` when used with Sanity
 *
 * @alpha This API might change.
 */
export function SanityFormBuilderProvider(props: SanityFormBuilderProviderProps) {
  const {
    __internal_patchChannel: patchChannel,
    components,
    resolveInputComponent: resolveInputComponentProp,
  } = props

  const resolveInputComponent = useCallback(
    (type: SchemaType) => {
      return defaultInputResolver(components?.inputs || {}, resolveInputComponentProp, type)
    },
    [components?.inputs, resolveInputComponentProp]
  )

  return (
    <FormBuilderProvider
      components={components}
      value={props.value}
      schema={props.schema}
      __internal_patchChannel={patchChannel}
      resolveInputComponent={resolveInputComponent}
      resolvePreviewComponent={previewResolver}
    >
      {props.children}
    </FormBuilderProvider>
  )
}