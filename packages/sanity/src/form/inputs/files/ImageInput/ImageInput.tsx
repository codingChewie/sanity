/* eslint-disable import/no-unresolved,react/jsx-handler-names */

import {
  Box,
  Button,
  Card,
  Dialog,
  Menu,
  MenuButton,
  MenuButtonProps,
  MenuItem,
  Stack,
  ToastParams,
} from '@sanity/ui'
import {get} from 'lodash'
import {Observable, Subscription} from 'rxjs'
import {ChevronDownIcon, ImageIcon, SearchIcon} from '@sanity/icons'
import {
  AssetFromSource,
  AssetSource,
  Image as BaseImage,
  ImageAsset,
  ImageSchemaType,
  UploadState,
} from '@sanity/types'
import React, {ReactNode} from 'react'
import deepCompare from 'react-fast-compare'
import {SanityClient} from '@sanity/client'
import {PatchEvent, setIfMissing, unset} from '../../../patch'
import {FieldMember, FIXME, InputProps, ObjectInputProps} from '../../../types'
import {PresenceOverlay} from '../../../../presence'
import {ImperativeToast} from '../../../../components/transitional'
import {
  ResolvedUploader,
  Uploader,
  UploaderResolver,
  UploadOptions,
} from '../../../studio/uploads/types'
import {UploadPlaceholder} from '../common/UploadPlaceholder'
import {WithReferencedAsset} from '../../../utils/WithReferencedAsset'
import {FileTarget} from '../common/styles'
import {ImageUrlBuilder} from '../types'
import {UploadProgress} from '../common/UploadProgress'
import {handleSelectAssetFromSource} from '../common/assetSource'
import {ActionsMenu} from '../common/ActionsMenu'
import {UploadWarning} from '../common/UploadWarning'
import {ImageToolInput} from '../ImageToolInput'
import {MemberField} from '../../ObjectInput/MemberField'
import {MemberFieldSet} from '../../ObjectInput/MemberFieldset'
import {ChangeIndicatorForFieldPath} from '../../../../components/changeIndicators'
import {FormInput} from '../../../FormInput'
import {ImageActionsMenu} from './ImageActionsMenu'
import {ImagePreview} from './ImagePreview'

export interface Image extends Partial<BaseImage> {
  _upload?: UploadState
}

export interface ImageInputProps extends ObjectInputProps<Image, ImageSchemaType> {
  assetSources: AssetSource[]
  directUploads?: boolean
  imageUrlBuilder: ImageUrlBuilder
  observeAsset: (documentId: string) => Observable<ImageAsset>
  resolveUploader: UploaderResolver
  client: SanityClient
}

const getDevicePixelRatio = () => {
  if (typeof window === 'undefined' || !window.devicePixelRatio) {
    return 1
  }
  return Math.round(Math.max(1, window.devicePixelRatio))
}

type FileInfo = {
  type: string // mime type
  kind: string // 'file' or 'string'
}

type ImageInputState = {
  isUploading: boolean
  selectedAssetSource: AssetSource | null
  // Metadata about files currently over the drop area
  hoveringFiles: FileInfo[]
  isStale: boolean
  isMenuOpen: boolean
}

type Focusable = {
  focus: () => void
  offsetHeight: number
}

function passThrough({children}: {children?: React.ReactNode}) {
  return children
}

const ASSET_FIELD_PATH = ['asset']

const ASSET_IMAGE_MENU_POPOVER: MenuButtonProps['popover'] = {portal: true}

export class ImageInput extends React.PureComponent<ImageInputProps, ImageInputState> {
  _assetElementRef: null | Focusable = null
  uploadSubscription: null | Subscription = null

  state: ImageInputState = {
    isUploading: false,
    selectedAssetSource: null,
    hoveringFiles: [],
    isStale: false,
    isMenuOpen: false,
  }

  toast: {push: (params: ToastParams) => void} | null = null

  focus() {
    if (this._assetElementRef) {
      this._assetElementRef.focus()
    }
  }

  setFocusElement = (el: HTMLElement | null) => {
    this._assetElementRef = el
  }

  isImageToolEnabled() {
    return get(this.props.schemaType, 'options.hotspot') === true
  }

  clearUploadStatus() {
    if (this.props.value?._upload) {
      this.props.onChange(unset(['_upload']))
    }
  }

  cancelUpload() {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe()
      this.clearUploadStatus()
    }
  }

  getUploadOptions = (file: File): ResolvedUploader[] => {
    const {schemaType, resolveUploader} = this.props
    const uploader = resolveUploader && resolveUploader(schemaType, file)
    return uploader ? [{type: schemaType, uploader}] : []
  }

  uploadFirstAccepted(files: File[]) {
    const {schemaType, resolveUploader} = this.props

    const match = files
      .map((file) => ({file, uploader: resolveUploader(schemaType, file)}))
      .find((result) => result.uploader)

    if (match) {
      this.uploadWith(match.uploader!, match.file)
    }

    this.setState({isMenuOpen: false})
  }

  uploadWith = (uploader: Uploader, file: File, assetDocumentProps: UploadOptions = {}) => {
    const {schemaType, onChange, client} = this.props
    const {label, title, description, creditLine, source} = assetDocumentProps
    const options = {
      metadata: get(schemaType, 'options.metadata'),
      storeOriginalFilename: get(schemaType, 'options.storeOriginalFilename'),
      label,
      title,
      description,
      creditLine,
      source,
    }

    this.cancelUpload()
    this.setState({isUploading: true})
    onChange(setIfMissing({_type: schemaType.name}))
    this.uploadSubscription = uploader.upload(client, file, schemaType, options).subscribe({
      next: (uploadEvent) => {
        if (uploadEvent.patches) {
          onChange(uploadEvent.patches)
        }
      },
      error: (err) => {
        // eslint-disable-next-line no-console
        console.error(err)
        this.toast?.push({
          status: 'error',
          description: 'The upload could not be completed at this time.',
          title: 'Upload failed',
        })

        this.clearUploadStatus()
      },
      complete: () => {
        onChange([unset(['hotspot']), unset(['crop'])])
        this.setState({isUploading: false})
        // this.toast.push({
        //   status: 'success',
        //   title: 'Upload completed',
        // })
      },
    })
  }

  handleRemoveButtonClick = () => {
    const {value} = this.props

    // When removing the image, we should also remove any crop and hotspot
    // _type and _key are "meta"-properties and are not significant unless
    // other properties are present. Thus, we want to remove the entire
    // "container" object if these are the only properties present, BUT
    // only if we're not an array element, as removing the array element
    // will close the selection dialog. Instead, when closing the dialog,
    // the array logic will check for an "empty" value and remove it for us
    const allKeys = Object.keys(value || {})
    const remainingKeys = allKeys.filter(
      (key) => !['_type', '_key', '_upload', 'asset', 'crop', 'hotspot'].includes(key)
    )

    const isEmpty = remainingKeys.length === 0
    const removeKeys = ['asset']
      .concat(allKeys.filter((key) => ['crop', 'hotspot', '_upload'].includes(key)))
      .map((key) => unset([key]))

    this.props.onChange(isEmpty && !this.valueIsArrayElement() ? unset() : removeKeys)
  }

  handleFieldChange = (event: PatchEvent) => {
    const {onChange, schemaType} = this.props

    // When editing a metadata field for an image (eg `altText`), and no asset
    // is currently selected, we want to unset the entire image field if the
    // field we are currently editing goes blank and gets unset.
    //
    // For instance:
    // An image field with an `altText` and a `title` subfield, where the image
    // `asset` and the `title` field is empty, and we are erasing the `alt` field.
    // We do _not_ however want to clear the field if any content is present in
    // the other fields - but we do not consider `crop` and `hotspot`.
    //
    // Also, we don't want to use this logic for array items, since the parent will
    // take care of it when closing the array dialog
    if (!this.valueIsArrayElement() && this.eventIsUnsettingLastFilledField(event)) {
      onChange(unset())
      return
    }

    onChange(
      event.prepend(
        setIfMissing({
          _type: schemaType.name,
        })
      ).patches
    )
  }

  eventIsUnsettingLastFilledField = (event: PatchEvent): boolean => {
    const patch = event.patches[0]
    if (event.patches.length !== 1 || patch.type !== 'unset') {
      return false
    }

    const allKeys = Object.keys(this.props.value || {})
    const remainingKeys = allKeys.filter(
      (key) => !['_type', '_key', 'crop', 'hotspot'].includes(key)
    )

    const isEmpty =
      event.patches[0].path.length === 1 &&
      remainingKeys.length === 1 &&
      remainingKeys[0] === event.patches[0].path[0]

    return isEmpty
  }

  valueIsArrayElement = () => {
    const {path} = this.props
    const parentPathSegment = path.slice(-1)[0]

    // String path segment mean an object path, while a number or a
    // keyed segment means we're a direct child of an array
    return typeof parentPathSegment !== 'string'
  }

  handleOpenDialog = () => {
    const {onOpenField} = this.props
    onOpenField('hotspot')
  }

  handleCloseDialog = () => {
    const {onCloseField} = this.props
    onCloseField('hotspot')
  }

  handleSelectAssetFromSource = (assetFromSource: AssetFromSource[]) => {
    const {onChange, schemaType, resolveUploader} = this.props
    handleSelectAssetFromSource({
      assetFromSource,
      onChange,
      type: schemaType,
      resolveUploader,
      uploadWith: this.uploadWith,
      isImage: true,
    })

    this.setState({selectedAssetSource: null})
  }

  handleFilesOver = (hoveringFiles: FileInfo[]) => {
    this.setState({
      hoveringFiles,
    })
  }
  handleFilesOut = () => {
    this.setState({
      hoveringFiles: [],
    })
  }

  handleCancelUpload = () => {
    this.cancelUpload()
  }

  handleClearUploadState = () => {
    this.setState({isStale: false})
    this.clearUploadStatus()
  }

  handleStaleUpload = () => {
    this.setState({isStale: true})
  }

  handleSelectFiles = (files: File[]) => {
    const {directUploads, readOnly} = this.props
    const {hoveringFiles} = this.state

    if (directUploads && !readOnly) {
      this.uploadFirstAccepted(files)
    } else if (hoveringFiles.length > 0) {
      this.handleFilesOut()
    }
  }

  handleSelectImageFromAssetSource = (source: AssetSource) => {
    this.setState({selectedAssetSource: source})
  }

  handleAssetSourceClosed = () => {
    this.setState({selectedAssetSource: null})
  }

  renderHotspotInput = (hotspotInputProps: InputProps) => {
    const {value, compareValue, id, imageUrlBuilder} = this.props

    const withImageTool = this.isImageToolEnabled() && value && value.asset

    return (
      <Dialog
        header="Edit hotspot and crop"
        id={`${id}_dialog`}
        onClose={this.handleCloseDialog}
        width={1}
        __unstable_autoFocus={false}
      >
        <PresenceOverlay>
          <Box padding={4}>
            <Stack space={5}>
              {withImageTool && value?.asset && (
                <ImageToolInput
                  {...this.props}
                  imageUrl={imageUrlBuilder.image(value.asset).url()}
                  value={value as FIXME}
                  presence={hotspotInputProps.presence}
                  compareValue={compareValue as FIXME}
                />
              )}
            </Stack>
          </Box>
        </PresenceOverlay>
      </Dialog>
    )
  }

  renderPreview = () => {
    const {value, schemaType, readOnly, directUploads, imageUrlBuilder, resolveUploader} =
      this.props

    if (!value) {
      return null
    }

    const {hoveringFiles} = this.state

    const acceptedFiles = hoveringFiles.filter((file) => resolveUploader(schemaType, file))
    const rejectedFilesCount = hoveringFiles.length - acceptedFiles.length

    return (
      <ImagePreview
        drag={!value?._upload && hoveringFiles.length > 0}
        isRejected={rejectedFilesCount > 0 || !directUploads}
        readOnly={readOnly}
        src={imageUrlBuilder
          .width(2000)
          .fit('max')
          .image(value)
          .dpr(getDevicePixelRatio())
          .auto('format')
          .url()}
        alt="Preview of uploaded image"
      />
    )
  }

  renderAssetMenu() {
    const {
      value,
      assetSources,
      schemaType,
      readOnly,
      directUploads,
      imageUrlBuilder,
      observeAsset,
    } = this.props
    const {isMenuOpen} = this.state

    const asset = value?.asset
    if (!asset) {
      return null
    }

    const accept = get(schemaType, 'options.accept', 'image/*')

    const showAdvancedEditButton = value && asset && this.isImageToolEnabled()

    let browseMenuItem: ReactNode =
      assetSources && assetSources.length === 0 ? null : (
        <MenuItem
          icon={SearchIcon}
          text="Select"
          onClick={() => {
            this.setState({isMenuOpen: false})
            this.handleSelectImageFromAssetSource(assetSources[0])
          }}
          disabled={readOnly}
          data-testid="file-input-browse-button"
        />
      )

    if (assetSources && assetSources.length > 1) {
      browseMenuItem = assetSources.map((assetSource) => {
        return (
          <MenuItem
            key={assetSource.name}
            text={assetSource.title}
            onClick={() => {
              this.setState({isMenuOpen: false})
              this.handleSelectImageFromAssetSource(assetSource)
            }}
            icon={assetSource.icon || ImageIcon}
            data-testid={`file-input-browse-button-${assetSource.name}`}
            disabled={readOnly}
          />
        )
      })
    }

    return (
      <WithReferencedAsset observeAsset={observeAsset} reference={asset}>
        {(assetDocument) => (
          <ImageActionsMenu
            isMenuOpen={isMenuOpen}
            onEdit={this.handleOpenDialog}
            showEdit={showAdvancedEditButton}
            onMenuOpen={(isOpen) => this.setState({isMenuOpen: isOpen})}
          >
            <ActionsMenu
              onUpload={this.handleSelectFiles}
              browse={browseMenuItem}
              onReset={this.handleRemoveButtonClick}
              downloadUrl={imageUrlBuilder
                .image(value.asset!)
                .forceDownload(
                  assetDocument.originalFilename || `download.${assetDocument.extension}`
                )
                .url()}
              copyUrl={imageUrlBuilder.image(value.asset!).url()}
              readOnly={readOnly}
              directUploads={directUploads}
              accept={accept}
            />
          </ImageActionsMenu>
        )}
      </WithReferencedAsset>
    )
  }

  renderBrowser() {
    const {assetSources, readOnly, directUploads, id} = this.props

    if (assetSources && assetSources.length === 0) return null

    if (assetSources && assetSources.length > 1 && !readOnly && directUploads) {
      return (
        <MenuButton
          id={`${id}_assetImageButton`}
          button={
            <Button
              mode="ghost"
              text="Select"
              data-testid="file-input-multi-browse-button"
              icon={SearchIcon}
              iconRight={ChevronDownIcon}
            />
          }
          menu={
            <Menu>
              {assetSources.map((assetSource) => {
                return (
                  <MenuItem
                    key={assetSource.name}
                    text={assetSource.title}
                    onClick={() => {
                      this.setState({isMenuOpen: false})
                      this.handleSelectImageFromAssetSource(assetSource)
                    }}
                    icon={assetSource.icon || ImageIcon}
                    disabled={readOnly}
                    data-testid={`file-input-browse-button-${assetSource.name}`}
                  />
                )
              })}
            </Menu>
          }
          popover={ASSET_IMAGE_MENU_POPOVER}
        />
      )
    }

    return (
      <Button
        fontSize={2}
        text="Select"
        icon={SearchIcon}
        mode="ghost"
        onClick={() => {
          this.setState({isMenuOpen: false})
          this.handleSelectImageFromAssetSource(assetSources[0])
        }}
        data-testid="file-input-browse-button"
        disabled={readOnly}
      />
    )
  }

  renderUploadPlaceholder() {
    const {schemaType, readOnly, directUploads, resolveUploader} = this.props

    const {hoveringFiles} = this.state

    const acceptedFiles = hoveringFiles.filter((file) => resolveUploader(schemaType, file))
    const rejectedFilesCount = hoveringFiles.length - acceptedFiles.length

    const accept = get(schemaType, 'options.accept', 'image/*')

    return (
      <div style={{padding: 1}}>
        <Card
          tone={readOnly ? 'transparent' : 'inherit'}
          border
          padding={3}
          style={
            hoveringFiles.length === 0
              ? {borderStyle: 'dashed'}
              : {borderStyle: 'dashed', borderColor: 'transparent'}
          }
        >
          <UploadPlaceholder
            browse={this.renderBrowser()}
            onUpload={this.handleSelectFiles}
            readOnly={readOnly}
            hoveringFiles={hoveringFiles}
            acceptedFiles={acceptedFiles}
            rejectedFilesCount={rejectedFilesCount}
            type="image"
            accept={accept}
            directUploads={directUploads}
          />
        </Card>
      </div>
    )
  }

  renderUploadState(uploadState: UploadState) {
    const {isUploading} = this.state
    const elementHeight = this._assetElementRef?.offsetHeight
    const height = elementHeight === 0 ? undefined : elementHeight

    return (
      <UploadProgress
        uploadState={uploadState}
        onCancel={isUploading ? this.handleCancelUpload : undefined}
        onStale={this.handleStaleUpload}
        height={height}
      />
    )
  }

  renderAssetSource() {
    const {selectedAssetSource} = this.state
    const {value, observeAsset} = this.props
    if (!selectedAssetSource) {
      return null
    }
    const Component = selectedAssetSource.component
    if (value && value.asset) {
      return (
        <WithReferencedAsset observeAsset={observeAsset} reference={value.asset}>
          {(imageAsset) => (
            <Component
              selectedAssets={[imageAsset]}
              assetType="image"
              selectionType="single"
              onClose={this.handleAssetSourceClosed}
              onSelect={this.handleSelectAssetFromSource}
            />
          )}
        </WithReferencedAsset>
      )
    }
    return (
      <Component
        selectedAssets={[]}
        selectionType="single"
        assetType="image"
        onClose={this.handleAssetSourceClosed}
        onSelect={this.handleSelectAssetFromSource}
      />
    )
  }

  setToast = (toast: {push: (params: ToastParams) => void}) => {
    this.toast = toast
  }

  hasChangeInFields(members: FieldMember[]) {
    const {value, compareValue} = this.props

    return members.some((member) => !deepCompare(value?.[member.name], compareValue?.[member.name]))
  }

  getFileTone() {
    const {schemaType, value, readOnly, directUploads, resolveUploader} = this.props

    const {hoveringFiles} = this.state

    const acceptedFiles = hoveringFiles.filter((file) => resolveUploader(schemaType, file))
    const rejectedFilesCount = hoveringFiles.length - acceptedFiles.length

    if (hoveringFiles.length > 0) {
      if (rejectedFilesCount > 0 || !directUploads) {
        return 'critical'
      }
    }

    if (!value?._upload && !readOnly && hoveringFiles.length > 0) {
      return 'primary'
    }

    if (readOnly) {
      return 'transparent'
    }

    return value?._upload && value?.asset ? 'transparent' : 'default'
  }

  renderAsset() {
    const {value, compareValue, readOnly, onFocus, onBlur} = this.props

    const {hoveringFiles, isStale} = this.state

    const hasValueOrUpload = Boolean(value?._upload || value?.asset)

    // todo: convert this to a functional component and use this with useCallback
    //  it currently has to return a new function on every render in order to pick up state from this component
    return (inputProps: InputProps) => (
      <>
        {isStale && (
          <Box marginBottom={2}>
            <UploadWarning onClearStale={this.handleClearUploadState} />
          </Box>
        )}

        <ChangeIndicatorForFieldPath
          path={ASSET_FIELD_PATH}
          hasFocus={inputProps.focused}
          isChanged={
            value?.asset?._ref !== compareValue?.asset?._ref
            // ||              this.hasChangeInFields(groupedMembers.imageToolAndDialog)
          }
        >
          {/* not uploading */}
          {!value?._upload && (
            <FileTarget
              tabIndex={0}
              disabled={Boolean(readOnly)}
              ref={this.setFocusElement}
              onFiles={this.handleSelectFiles}
              onFilesOver={this.handleFilesOver}
              onFilesOut={this.handleFilesOut}
              onFocus={onFocus}
              onBlur={onBlur}
              tone={this.getFileTone()}
              $border={hasValueOrUpload || hoveringFiles.length > 0}
              style={{padding: 1}}
              sizing="border"
              radius={2}
            >
              {!value?.asset && this.renderUploadPlaceholder()}
              {!value?._upload && value?.asset && (
                <div style={{position: 'relative'}}>
                  {this.renderAssetMenu()}
                  {this.renderPreview()}
                </div>
              )}
            </FileTarget>
          )}

          {/* uploading */}
          {value?._upload && this.renderUploadState(value._upload)}
        </ChangeIndicatorForFieldPath>
      </>
    )
  }

  render() {
    const {members, renderInput, renderField, renderItem, renderPreview} = this.props

    const {selectedAssetSource} = this.state

    // we use the hotspot field as the "owner" of both hotspot and crop
    const hotspotField = members.find(
      (member): member is FieldMember => member.kind === 'field' && member.name === 'hotspot'
    )

    return (
      <>
        <ImperativeToast ref={this.setToast} />

        {members.map((member) => {
          if (member.kind === 'field' && (member.name === 'crop' || member.name === 'hotspot')) {
            // we're rendering these separately
            return null
          }

          if (member.kind === 'field') {
            return (
              <MemberField
                key={member.key}
                member={member}
                renderInput={member.name === 'asset' ? this.renderAsset() : renderInput}
                renderField={member.name === 'asset' ? passThrough : renderField}
                renderItem={renderItem}
                renderPreview={renderPreview}
              />
            )
          }
          return (
            <MemberFieldSet
              key={member.key}
              member={member}
              renderInput={renderInput}
              renderField={renderField}
              renderItem={renderItem}
              renderPreview={renderPreview}
            />
          )
        })}
        {hotspotField?.open && (
          <FormInput
            {...this.props}
            absolutePath={hotspotField.field.path}
            renderInput={this.renderHotspotInput}
          />
        )}
        {selectedAssetSource && this.renderAssetSource()}
      </>
    )
  }
}