import React from 'react'
import * as PathUtils from '@sanity/util/paths'
import {ConditionalProperty, File, FileSchemaType, ObjectField} from '@sanity/types'
import {PatchEvent} from '../../../patch'
import {FormBuilderInput} from '../../../FormBuilderInput'
import {ConditionalHiddenField, ConditionalReadOnlyField} from '../../common'
import {ObjectFieldProps} from '../../../store/types'

export interface FileInputFieldProps
  extends Omit<ObjectFieldProps<File, FileSchemaType>, 'readOnly' | 'type'> {
  field: ObjectField
  parentValue?: Record<string, unknown>
  readOnly: ConditionalProperty
}

export function FileInputField(props: FileInputFieldProps) {
  const {onChange, field, ...restProps} = props

  const handleChange = React.useCallback(
    (ev: PatchEvent) => {
      onChange(ev.prefixAll(field.name))
    },
    [onChange, field]
  )

  return (
    <ConditionalHiddenField
      parent={props.parentValue}
      value={props.value}
      hidden={props.field.type.hidden}
    >
      <ConditionalReadOnlyField readOnly={props.readOnly} value={props.value}>
        <FormBuilderInput
          {...restProps}
          type={field.type}
          path={PathUtils.pathFor([field.name])}
          onChange={handleChange}
        />
      </ConditionalReadOnlyField>
    </ConditionalHiddenField>
  )
}