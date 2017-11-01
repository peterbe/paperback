import React from 'react'

export const Confirmation = ({
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Yes'
}) => {
  return (
    <div>
      <button
        type="button"
        className="button is-small is-primary"
        onClick={onConfirm}
      >
        {confirmText}
      </button>
      <button
        type="button"
        className="button is-small is-light"
        onClick={onCancel}
      >
        {cancelText}
      </button>
    </div>
  )
}
