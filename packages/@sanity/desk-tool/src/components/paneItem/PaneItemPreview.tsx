import {SanityDocument, SchemaType} from '@sanity/types'
import {PreviewLayoutKey} from '@sanity/base/components'
import {DocumentPresence, DocumentPreviewPresence} from '@sanity/base/presence'
import {DocumentPreviewStore, SanityDefaultPreview} from '@sanity/base/preview'
import React, {isValidElement} from 'react'
import {Subscription} from 'rxjs'
import {isNumber} from 'lodash'
import {Inline} from '@sanity/ui'
import {isRecord, isString} from '../../helpers'
import {PublishedStatus} from '../PublishedStatus'
import {DraftStatus} from '../DraftStatus'
import {getPreviewStateObservable, getValueWithFallback} from './helpers'
import {PaneItemPreviewState} from './types'

export interface PaneItemPreviewProps {
  documentPreviewStore: DocumentPreviewStore
  icon: React.ComponentType | false
  layout: PreviewLayoutKey
  presence?: DocumentPresence[]
  schemaType: SchemaType
  value: SanityDocument
}

export class PaneItemPreview extends React.Component<PaneItemPreviewProps, PaneItemPreviewState> {
  state: PaneItemPreviewState = {}

  subscription: Subscription

  constructor(props: PaneItemPreviewProps) {
    super(props)

    const {value, schemaType} = props
    // const {title} = value
    const title =
      (isRecord(value.title) && isValidElement(value.title)) ||
      isString(value.title) ||
      isNumber(value.title)
        ? value.title
        : null

    let sync = true

    this.subscription = getPreviewStateObservable(
      props.documentPreviewStore,
      schemaType,
      value._id,
      title
    ).subscribe((state) => {
      if (sync) {
        this.state = state
      } else {
        this.setState(state)
      }
    })

    sync = false
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  render() {
    const {icon, layout, presence, value} = this.props
    const {draft, published, isLoading} = this.state

    const status = isLoading ? null : (
      <Inline space={4}>
        {presence && presence.length > 0 && <DocumentPreviewPresence presence={presence} />}
        <PublishedStatus document={published} />
        <DraftStatus document={draft} />
      </Inline>
    )

    return (
      <SanityDefaultPreview
        value={getValueWithFallback({value, draft, published})}
        isPlaceholder={isLoading}
        icon={icon}
        layout={layout}
        status={status}
      />
    )
  }
}
