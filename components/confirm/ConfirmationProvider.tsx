'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Modal, Button } from 'react-bootstrap'

export type ConfirmOptions = {
  title?: string
  message?: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  variantConfirm?: string
  variantCancel?: string
}

export type ConfirmFn = (messageOrOptions?: string | ConfirmOptions, maybeOptions?: ConfirmOptions) => Promise<boolean>

interface ConfirmationContextValue {
  confirm: ConfirmFn
}

const ConfirmationContext = createContext<ConfirmationContextValue | undefined>(undefined)

export function useConfirm() {
  const ctx = useContext(ConfirmationContext)
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmationProvider/>')
  return ctx.confirm
}

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Required<ConfirmOptions>>({
    title: 'Confirmação',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variantConfirm: 'primary',
    variantCancel: 'secondary'
  })
  const resolverRef = useRef<((v: boolean) => void) | null>(null)

  const confirm: ConfirmFn = useCallback((messageOrOptions?: string | ConfirmOptions, maybeOptions?: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      const opts: ConfirmOptions = typeof messageOrOptions === 'string' ? { message: messageOrOptions, ...(maybeOptions || {}) } : (messageOrOptions || {})
      setOptions(prev => ({ ...prev, ...opts, message: opts.message ?? prev.message }))
      setOpen(true)
      resolverRef.current = resolve
    })
  }, [])

  const handleClose = (v: boolean) => {
    setOpen(false)
    if (resolverRef.current) {
      resolverRef.current(v)
      resolverRef.current = null
    }
  }

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <Modal show={open} onHide={() => handleClose(false)} backdrop="static" centered>
        {options.title && <Modal.Header closeButton><Modal.Title>{options.title}</Modal.Title></Modal.Header>}
        <Modal.Body>
          {typeof options.message === 'string' ? <p className='mb-0'>{options.message}</p> : options.message}
        </Modal.Body>
        <Modal.Footer>
          <Button variant={options.variantCancel} onClick={() => handleClose(false)}>{options.cancelText}</Button>
          <Button variant={options.variantConfirm} onClick={() => handleClose(true)}>{options.confirmText}</Button>
        </Modal.Footer>
      </Modal>
    </ConfirmationContext.Provider>
  )
}
