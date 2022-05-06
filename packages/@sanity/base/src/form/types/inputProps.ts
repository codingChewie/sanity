import {
  ArraySchemaType,
  BooleanSchemaType,
  NumberSchemaType,
  ObjectSchemaType,
  Path,
  SchemaType,
  StringSchemaType,
  ValidationMarker,
} from '@sanity/types'
import * as React from 'react'
import {FormPatch, FormSetPatch, FormUnsetPatch, PatchEvent} from '../patch'

import {
  ArrayOfObjectsNode,
  ArrayOfPrimitivesNode,
  BooleanNode,
  NumberNode,
  ObjectNode,
  StringNode,
} from '../store/types/nodes'
import {FormFieldPresence} from '../../presence'
import {
  RenderFieldCallback,
  RenderInputCallback,
  RenderArrayOfObjectsItemCallback,
  RenderArrayOfPrimitivesItemCallback,
} from './renderCallback'
import {InsertItemEvent, MoveItemEvent} from './event'
import {FieldGroup} from './fieldGroups'

// these are the props shared by *all* inputs
export interface BaseInputProps {
  focusRef: React.Ref<any>

  onFocus: (event: React.FocusEvent) => void
  onBlur: (event: React.FocusEvent) => void

  validation: ValidationMarker[]
  presence: FormFieldPresence[]
}

export interface ObjectInputProps<
  T = {[key in string]: unknown},
  S extends ObjectSchemaType = ObjectSchemaType
> extends ObjectNode<T, S>,
    BaseInputProps {
  groups: FieldGroup[]

  // todo: consider remove PatchEvent
  onChange: (patch: FormPatch | FormPatch[] | PatchEvent) => void

  collapsed: boolean | undefined
  onSetCollapsed: (collapsed: boolean) => void
  onSetFieldCollapsed: (fieldName: string, collapsed: boolean) => void
  onSetFieldSetCollapsed: (fieldsetName: string, collapsed: boolean) => void

  onFocusPath: (path: Path) => void
  onSelectFieldGroup: (groupName: string) => void

  renderInput: RenderInputCallback
  renderField: RenderFieldCallback
  renderItem: RenderArrayOfObjectsItemCallback
}

export interface ArrayOfObjectsInputProps<
  T extends {_key: string} = {_key: string},
  S extends ArraySchemaType = ArraySchemaType
> extends ArrayOfObjectsNode<T[], S>,
    BaseInputProps {
  onChange: (patch: FormPatch | FormPatch[] | PatchEvent) => void
  onAppendItem: (item: T) => void
  onPrependItem: (item: T) => void
  onRemoveItem: (itemKey: string) => void
  onMoveItem: (event: MoveItemEvent) => void
  onInsert: (event: InsertItemEvent) => void

  resolveInitialValue: (type: SchemaType, params: Record<string, unknown>) => Promise<T>

  onFocusPath: (path: Path) => void

  // note: not a priority to support collapsible arrays right now
  onSetCollapsed: (collapsed: boolean) => void

  // this opens/close items
  onSetItemCollapsed: (itemKey: string, collapsed: boolean) => void

  renderInput: RenderInputCallback
  renderItem: RenderArrayOfObjectsItemCallback
  renderField: RenderFieldCallback
}

type ElementType<T extends any[]> = T extends (infer K)[] ? K : unknown

export interface ArrayOfPrimitivesInputProps<
  T extends (string | boolean | number)[] = (string | boolean | number)[],
  S extends ArraySchemaType = ArraySchemaType
> extends ArrayOfPrimitivesNode<T, S>,
    BaseInputProps {
  // note: not a priority to support collapsible arrays right now
  onSetCollapsed: (collapsed: boolean) => void

  onChange: (patch: FormPatch | FormPatch[] | PatchEvent) => void

  onAppendItem: (item: ElementType<T>) => void
  onPrependItem: (item: ElementType<T>) => void
  onRemoveItem: (index: number) => void
  onMoveItem: (event: MoveItemEvent) => void
  onInsert: (event: {items: T; position: 'before' | 'after'; referenceIndex: number}) => void

  onFocusIndex: (index: number) => void

  renderInput: RenderInputCallback
  renderItem: RenderArrayOfPrimitivesItemCallback
}

export interface StringInputProps<S extends StringSchemaType = StringSchemaType>
  extends StringNode<S>,
    BaseInputProps {
  onChange: (patch: FormPatch | FormPatch[] | PatchEvent) => void
}

export interface NumberInputProps<S extends NumberSchemaType = NumberSchemaType>
  extends NumberNode<S>,
    BaseInputProps {
  onChange: (patch: FormPatch | FormPatch[] | PatchEvent) => void
}
export interface BooleanInputProps<S extends BooleanSchemaType = BooleanSchemaType>
  extends BooleanNode<S>,
    BaseInputProps {
  onChange: (patch: FormPatch | FormPatch[] | PatchEvent) => void
}

export type PrimitiveInputProps = StringInputProps | BooleanInputProps | NumberInputProps

export type InputProps =
  | ObjectInputProps
  | ArrayOfObjectsInputProps
  | ArrayOfPrimitivesInputProps
  | StringInputProps
  | BooleanInputProps
  | NumberInputProps